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
      customer: { select: { membership: { select: { user: { select: { name: true, phone: true } } } } } },
    },
  },
  driver: { include: { membership: { include: { user: { select: { name: true, phone: true } } } } } },
} satisfies Prisma.DeliveryInclude;

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  findAvailable(companyId: string) {
    return this.prisma.delivery.findMany({
      where: { companyId, status: DeliveryStatus.AWAITING_DRIVER },
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

  findAllForAdmin(companyId: string) {
    return this.prisma.delivery.findMany({
      where: { companyId },
      include: DELIVERY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(companyId: string, driverId: string, actingUserId: string, deliveryId: string) {
    const delivery = await this.findByIdOrThrow(companyId, deliveryId);
    if (delivery.status !== DeliveryStatus.AWAITING_DRIVER) {
      throw new BadRequestException('Esta entrega já foi assumida por outro entregador');
    }

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { driverId, status: DeliveryStatus.DRIVER_ASSIGNED, assignedAt: new Date() },
    });

    await this.ordersService.updateStatus(actingUserId, companyId, delivery.order.id, {
      status: OrderStatus.OUT_FOR_DELIVERY,
      note: 'Entregador aceitou a corrida',
    });

    return this.findByIdOrThrow(companyId, deliveryId);
  }

  // Admin atribui manualmente, sem depender de um entregador aceitar.
  async assignManually(companyId: string, adminUserId: string, deliveryId: string, driverId: string) {
    const delivery = await this.findByIdOrThrow(companyId, deliveryId);
    const driver = await this.prisma.deliveryDriver.findFirst({
      where: { id: driverId, membership: { companyId } },
    });
    if (!driver || !driver.active) throw new NotFoundException('Entregador não encontrado ou inativo');

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { driverId, status: DeliveryStatus.DRIVER_ASSIGNED, assignedAt: new Date() },
    });

    if (delivery.order.status === OrderStatus.READY) {
      await this.ordersService.updateStatus(adminUserId, companyId, delivery.order.id, {
        status: OrderStatus.OUT_FOR_DELIVERY,
        note: 'Entregador atribuído manualmente pelo administrador',
      });
    }

    return this.findByIdOrThrow(companyId, deliveryId);
  }

  async markPickedUp(companyId: string, driverId: string, deliveryId: string) {
    const delivery = await this.findOwnedByDriverOrThrow(companyId, driverId, deliveryId);
    if (delivery.status !== DeliveryStatus.DRIVER_ASSIGNED) {
      throw new BadRequestException('Esta entrega não está aguardando retirada');
    }

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() },
      include: DELIVERY_INCLUDE,
    });
  }

  async markDelivered(companyId: string, driverId: string, actingUserId: string, deliveryId: string) {
    const delivery = await this.findOwnedByDriverOrThrow(companyId, driverId, deliveryId);
    if (delivery.status !== DeliveryStatus.PICKED_UP) {
      throw new BadRequestException('Confirme a retirada antes de marcar como entregue');
    }

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
    });

    await this.ordersService.updateStatus(actingUserId, companyId, delivery.order.id, {
      status: OrderStatus.DELIVERED,
      note: 'Entregador confirmou a entrega',
    });

    return this.findByIdOrThrow(companyId, deliveryId);
  }

  async rate(companyId: string, customerId: string, deliveryId: string, dto: RateDeliveryDto) {
    const delivery = await this.findByIdOrThrow(companyId, deliveryId);
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

    return this.findByIdOrThrow(companyId, deliveryId);
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

  private async findByIdOrThrow(companyId: string, id: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, companyId },
      include: DELIVERY_INCLUDE,
    });
    if (!delivery) throw new NotFoundException('Entrega não encontrada');
    return delivery;
  }

  private async findOwnedByDriverOrThrow(companyId: string, driverId: string, id: string) {
    const delivery = await this.findByIdOrThrow(companyId, id);
    if (delivery.driverId !== driverId) {
      throw new ForbiddenException('Esta entrega não está atribuída a você');
    }
    return delivery;
  }
}
