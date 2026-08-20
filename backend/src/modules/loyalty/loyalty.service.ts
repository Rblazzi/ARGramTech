import { BadRequestException, Injectable } from '@nestjs/common';
import { CouponType, LoyaltyTier, LoyaltyTransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedeemPointsDto } from './dto/redeem-points.dto';

// 1 ponto para cada R$1 gasto (regra pedida no briefing).
const POINTS_PER_REAL_SPENT = 1;
// 100 pontos = R$10 de desconto ao resgatar.
const POINTS_PER_REAL_DISCOUNT = 10;

// Níveis calculados pelo total de pontos já GANHOS na vida do cliente
// (não pelo saldo atual) — resgatar pontos não faz o cliente perder o
// nível conquistado.
const TIER_THRESHOLDS: Array<{ tier: LoyaltyTier; minPoints: number }> = [
  { tier: LoyaltyTier.DIAMOND, minPoints: 700 },
  { tier: LoyaltyTier.GOLD, minPoints: 300 },
  { tier: LoyaltyTier.SILVER, minPoints: 100 },
  { tier: LoyaltyTier.BRONZE, minPoints: 0 },
];

function tierForLifetimePoints(lifetimePoints: number): LoyaltyTier {
  return TIER_THRESHOLDS.find((t) => lifetimePoints >= t.minPoints)!.tier;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getSummary(customerId: string) {
    const [customer, lifetimeAgg, transactions] = await Promise.all([
      this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
      this.prisma.loyaltyTransaction.aggregate({
        where: { customerId, type: LoyaltyTransactionType.EARNED },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      balance: customer.loyaltyPoints,
      tier: customer.loyaltyTier,
      lifetimePoints: lifetimeAgg._sum.points ?? 0,
      pointsPerRealDiscount: POINTS_PER_REAL_DISCOUNT,
      transactions,
    };
  }

  // Chamado quando um pedido é entregue. Idempotente: um pedido só gera
  // pontos uma vez, mesmo que o método seja chamado de novo por engano.
  async awardPointsForOrder(orderId: string) {
    const alreadyAwarded = await this.prisma.loyaltyTransaction.findFirst({
      where: { orderId, type: LoyaltyTransactionType.EARNED },
    });
    if (alreadyAwarded) return;

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    const points = Math.floor(Number(order.total) * POINTS_PER_REAL_SPENT);
    if (points <= 0) return;

    await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: order.customerId,
        orderId,
        points,
        type: LoyaltyTransactionType.EARNED,
        description: `Pedido #${order.orderNumber}`,
      },
    });

    await this.prisma.customer.update({
      where: { id: order.customerId },
      data: { loyaltyPoints: { increment: points }, lastOrderAt: new Date() },
    });

    await this.recalculateTier(order.customerId);

    await this.notifications.notify({
      customerId: order.customerId,
      title: 'Você ganhou pontos!',
      message: `Você ganhou ${points} pontos de fidelidade com o pedido #${order.orderNumber}.`,
    });
  }

  async redeem(customerId: string, dto: RedeemPointsDto) {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (customer.loyaltyPoints < dto.points) {
      throw new BadRequestException('Você não tem pontos suficientes');
    }

    const discountValue = Math.floor(dto.points / POINTS_PER_REAL_DISCOUNT);
    if (discountValue <= 0) {
      throw new BadRequestException(`Resgate no mínimo ${POINTS_PER_REAL_DISCOUNT} pontos`);
    }

    const code = `FIDELIDADE${Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('')}`;

    const [, , coupon] = await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: {
          customerId,
          points: -dto.points,
          type: LoyaltyTransactionType.REDEEMED,
          description: `Resgate de ${dto.points} pontos por cupom de desconto`,
        },
      }),
      this.prisma.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { decrement: dto.points } } }),
      this.prisma.coupon.create({
        data: {
          code,
          type: CouponType.FIXED,
          value: discountValue,
          usageLimit: 1,
          usageLimitPerCustomer: 1,
          active: true,
        },
      }),
    ]);

    return { couponCode: coupon.code, discountValue };
  }

  private async recalculateTier(customerId: string) {
    const lifetimeAgg = await this.prisma.loyaltyTransaction.aggregate({
      where: { customerId, type: LoyaltyTransactionType.EARNED },
      _sum: { points: true },
    });
    const tier = tierForLifetimePoints(lifetimeAgg._sum.points ?? 0);
    await this.prisma.customer.update({ where: { id: customerId }, data: { loyaltyTier: tier } });
  }
}
