import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Address, OrderStatus, OrderType, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const STATUS_NOTIFICATION_MESSAGE: Partial<Record<OrderStatus, string>> = {
  PAYMENT_CONFIRMED: 'Pagamento confirmado! Seu pedido #{n} já está na fila da cozinha.',
  ACCEPTED: 'Seu pedido #{n} foi aceito e logo entra em preparo.',
  PREPARING: 'Seu pedido #{n} está sendo preparado.',
  READY: 'Seu pedido #{n} está pronto!',
  OUT_FOR_DELIVERY: 'Seu pedido #{n} saiu para entrega.',
  DELIVERED: 'Seu pedido #{n} foi entregue. Bom apetite!',
  CANCELLED: 'Seu pedido #{n} foi cancelado.',
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, name: true, imageUrl: true } },
      selectedOptions: true,
    },
  },
  statusHistory: { orderBy: { createdAt: Prisma.SortOrder.asc } },
  payments: true,
  address: true,
  delivery: true,
  customer: { include: { user: { select: { name: true, phone: true } } } },
} satisfies Prisma.OrderInclude;

// Máquina de estados dos pedidos: de qual status se pode ir para quais.
// Cancelamento é permitido a partir de qualquer status não-terminal.
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: [OrderStatus.PAYMENT_CONFIRMED, OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  PAYMENT_CONFIRMED: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  ACCEPTED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

// Datas específicas que o schema guarda além do histórico genérico.
const STATUS_TIMESTAMP_FIELD: Partial<Record<OrderStatus, string>> = {
  ACCEPTED: 'acceptedAt',
  READY: 'readyAt',
  DELIVERED: 'deliveredAt',
  CANCELLED: 'cancelledAt',
};

// Um pedido em grupo só deve aparecer no histórico do cliente e na fila
// da cozinha depois que o grupo foi fechado E o pagamento foi resolvido
// (ou liberado manualmente) — enquanto isso, ele é só um rascunho sendo
// montado pelos participantes.
const VISIBLE_TO_ORDER_LISTS: Prisma.OrderWhereInput = {
  OR: [{ groupOrderId: null }, { groupOrder: { status: 'CONFIRMED' } }],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly deliveryZonesService: DeliveryZonesService,
    private readonly notifications: NotificationsService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async findAllForCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId, ...VISIBLE_TO_ORDER_LISTS },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForCustomer(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.customerId !== customerId) throw new ForbiddenException('Este pedido não pertence a você');
    return order;
  }

  async create(customerId: string, dto: CreateOrderDto) {
    const summary = await this.cartService.getSummary(customerId);
    if (!summary.id || summary.items.length === 0) {
      throw new BadRequestException('Seu carrinho está vazio');
    }

    let address: Address | null = null;
    if (dto.type === OrderType.DELIVERY) {
      address = await this.prisma.address.findFirst({
        where: { id: dto.addressId, customerId, deletedAt: null },
      });
      if (!address) throw new BadRequestException('Endereço de entrega inválido');
    }

    const deliveryFee = await this.deliveryZonesService.calculateFee({
      type: dto.type,
      address,
      subtotal: summary.subtotal,
    });
    const total = round2(summary.subtotal - summary.discount + deliveryFee);

    const cart = await this.prisma.cart.findUniqueOrThrow({ where: { id: summary.id } });

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId,
          type: dto.type,
          status: OrderStatus.RECEIVED,
          paymentMode: 'SINGLE',
          addressId: dto.type === OrderType.DELIVERY ? dto.addressId : null,
          couponId: cart.couponId,
          subtotal: summary.subtotal,
          deliveryFee,
          discount: summary.discount,
          total,
          notes: dto.notes,
          items: {
            create: summary.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              notes: item.notes,
              selectedOptions: {
                create: item.selectedOptions.map((opt) => ({
                  optionItemId: opt.id,
                  nameSnapshot: opt.name,
                  priceDeltaSnapshot: opt.priceDelta,
                })),
              },
            })),
          },
          statusHistory: {
            create: { status: OrderStatus.RECEIVED, changedByUserId: customerId, note: 'Pedido criado pelo cliente' },
          },
          payments: {
            create: { method: dto.paymentMethod, status: PaymentStatus.PENDING, amount: summary.total },
          },
        },
        include: ORDER_INCLUDE,
      });

      if (cart.couponId) {
        await tx.couponUsage.create({
          data: { couponId: cart.couponId, customerId, orderId: created.id },
        });
      }

      await tx.cart.update({ where: { id: cart.id }, data: { status: 'CONVERTED', couponId: null } });

      return created;
    });

    await this.maybeNotifyMinOrderValuePromotion(customerId, summary.subtotal);

    return order;
  }

  // Promoção reativa (não precisa de cron): se o pedido bateu o valor
  // mínimo configurado em alguma promoção ativa, avisa o cliente.
  private async maybeNotifyMinOrderValuePromotion(customerId: string, subtotal: number) {
    const promotions = await this.prisma.promotion.findMany({
      where: { type: 'MIN_ORDER_VALUE', active: true },
      include: { coupon: true },
    });

    for (const promotion of promotions) {
      const ruleConfig = promotion.ruleConfig as Record<string, number> | null;
      const minValue = Number(ruleConfig?.minValue ?? Infinity);
      if (subtotal < minValue) continue;

      await this.notifications.notify({
        customerId,
        title: 'Você ganhou um benefício!',
        message: promotion.coupon
          ? `Seu pedido passou de R$ ${minValue.toFixed(2)}! Use o cupom ${promotion.coupon.code} no próximo pedido.`
          : `Seu pedido passou de R$ ${minValue.toFixed(2)}! Fique de olho nas próximas novidades.`,
      });
    }
  }

  // Fila da cozinha/atendimento: pedidos ainda não finalizados, mais
  // antigos primeiro (FIFO).
  findActiveForStaff() {
    return this.prisma.order.findMany({
      where: { status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] }, ...VISIBLE_TO_ORDER_LISTS },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateStatus(staffUserId: string, orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    const allowedNext = ORDER_TRANSITIONS[order.status];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Não é possível mudar de "${order.status}" para "${dto.status}"`,
      );
    }

    const timestampField = STATUS_TIMESTAMP_FIELD[dto.status];
    // Pedido pronto + é entrega -> abre vaga pra um entregador aceitar.
    const shouldOpenDelivery = dto.status === OrderStatus.READY && order.type === OrderType.DELIVERY;

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(timestampField && { [timestampField]: new Date() }),
        statusHistory: {
          create: { status: dto.status, changedByUserId: staffUserId, note: dto.note },
        },
        ...(shouldOpenDelivery && {
          delivery: {
            connectOrCreate: {
              where: { orderId },
              create: { status: 'AWAITING_DRIVER' },
            },
          },
        }),
      },
      include: ORDER_INCLUDE,
    });

    await this.notifyStatusChange(updated.customerId, updated.orderNumber, dto.status);
    if (dto.status === OrderStatus.DELIVERED) {
      await this.loyaltyService.awardPointsForOrder(orderId);
    }

    return updated;
  }

  // Chamado pelo PaymentsService quando um pagamento é confirmado
  // (webhook do gateway ou simulação local) — não tem um usuário
  // "responsável" por trás, é o sistema reagindo a um evento externo.
  async confirmPaymentReceived(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.status !== OrderStatus.RECEIVED) return order; // já avançou, nada a fazer

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAYMENT_CONFIRMED,
        statusHistory: {
          create: { status: OrderStatus.PAYMENT_CONFIRMED, note: 'Pagamento confirmado automaticamente' },
        },
      },
    });

    await this.notifyStatusChange(updated.customerId, updated.orderNumber, OrderStatus.PAYMENT_CONFIRMED);
    return updated;
  }

  private async notifyStatusChange(customerId: string, orderNumber: number, status: OrderStatus) {
    const template = STATUS_NOTIFICATION_MESSAGE[status];
    if (!template) return;

    await this.notifications.notify({
      customerId,
      title: 'Atualização do seu pedido',
      message: template.replace('{n}', String(orderNumber)),
    });
  }
}
