import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { RateDeliveryDto } from './dto/rate-delivery.dto';

const DELIVERY_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      total: true,
      customerId: true,
      status: true,
      address: true,
      customer: { select: { user: { select: { name: true, phone: true } } } },
    },
  },
  driver: { include: { user: { select: { name: true, phone: true } } } },
} satisfies Prisma.DeliveryInclude;

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  findAvailable() {
    return this.prisma.delivery.findMany({
      where: { status: DeliveryStatus.AWAITING_DRIVER },
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  findMine(driverId: string) {
    return this.prisma.delivery.findMany({
      where: { driverId },
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForAdmin() {
    return this.prisma.delivery.findMany({
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(driverId: string, deliveryId: string) {
    const delivery = await this.findByIdOrThrow(deliveryId);
    if (delivery.status !== DeliveryStatus.AWAITING_DRIVER) {
      throw new BadRequestException('Esta entrega já foi assumida por outro entregador');
    }

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { driverId, status: DeliveryStatus.DRIVER_ASSIGNED, assignedAt: new Date() },
    });

    await this.ordersService.updateStatus(driverId, delivery.orderId, {
      status: OrderStatus.OUT_FOR_DELIVERY,
      note: 'Entregador aceitou a corrida',
    });

    return this.findByIdOrThrow(deliveryId);
  }

  // Admin atribui manualmente, sem depender de um entregador aceitar.
  async assignManually(adminUserId: string, deliveryId: string, driverId: string) {
    const delivery = await this.findByIdOrThrow(deliveryId);
    const driver = await this.prisma.deliveryDriver.findUnique({ where: { id: driverId } });
    if (!driver || !driver.active) throw new NotFoundException('Entregador não encontrado ou inativo');

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { driverId, status: DeliveryStatus.DRIVER_ASSIGNED, assignedAt: new Date() },
    });

    if (delivery.order.status === OrderStatus.READY) {
      await this.ordersService.updateStatus(adminUserId, delivery.orderId, {
        status: OrderStatus.OUT_FOR_DELIVERY,
        note: 'Entregador atribuído manualmente pelo administrador',
      });
    }

    return this.findByIdOrThrow(deliveryId);
  }

  async markPickedUp(driverId: string, deliveryId: string) {
    const delivery = await this.findOwnedByDriverOrThrow(driverId, deliveryId);
    if (delivery.status !== DeliveryStatus.DRIVER_ASSIGNED) {
      throw new BadRequestException('Esta entrega não está aguardando retirada');
    }

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() },
      include: DELIVERY_INCLUDE,
    });
  }

  async markDelivered(driverId: string, deliveryId: string) {
    const delivery = await this.findOwnedByDriverOrThrow(driverId, deliveryId);
    if (delivery.status !== DeliveryStatus.PICKED_UP) {
      throw new BadRequestException('Confirme a retirada antes de marcar como entregue');
    }

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
    });

    await this.ordersService.updateStatus(driverId, delivery.orderId, {
      status: OrderStatus.DELIVERED,
      note: 'Entregador confirmou a entrega',
    });

    return this.findByIdOrThrow(deliveryId);
  }

  async rate(customerId: string, deliveryId: string, dto: RateDeliveryDto) {
    const delivery = await this.findByIdOrThrow(deliveryId);
    if (delivery.order.customerId !== customerId) {
      throw new ForbiddenException('Esta entrega não pertence a você');
    }
    if (delivery.status !== DeliveryStatus.DELIVERED) {
      throw new BadRequestException('Só é possível avaliar uma entrega concluída');
    }
    if (!delivery.driverId) {
      throw new BadRequestException('Esta entrega não tem entregador associado');
    }

    await this.prisma.delivery.update({ where: { id: deliveryId }, data: { customerRating: dto.rating } });
    await this.recalculateDriverRating(delivery.driverId);

    return this.findByIdOrThrow(deliveryId);
  }

  private async recalculateDriverRating(driverId: string) {
    const result = await this.prisma.delivery.aggregate({
      where: { driverId, customerRating: { not: null } },
      _avg: { customerRating: true },
    });
    await this.prisma.deliveryDriver.update({
      where: { id: driverId },
      data: { ratingAverage: result._avg.customerRating ?? 0 },
    });
  }

  private async findByIdOrThrow(id: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id }, include: DELIVERY_INCLUDE });
    if (!delivery) throw new NotFoundException('Entrega não encontrada');
    return delivery;
  }

  private async findOwnedByDriverOrThrow(driverId: string, id: string) {
    const delivery = await this.findByIdOrThrow(id);
    if (delivery.driverId !== driverId) {
      throw new ForbiddenException('Esta entrega não está atribuída a você');
    }
    return delivery;
  }
}
