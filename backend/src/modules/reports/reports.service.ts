import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary(companyId: string, params: { from?: Date; to?: Date }) {
    const from = params.from ?? startOfToday();
    const to = params.to ?? new Date();

    const orders = await this.prisma.order.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: true,
      },
    });

    const nonCancelled = orders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const cancelled = orders.filter((o) => o.status === OrderStatus.CANCELLED);
    const totalRevenue = round2(nonCancelled.reduce((sum, o) => sum + Number(o.total), 0));

    const ordersByStatus: Record<string, number> = {};
    for (const o of orders) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
    }

    const revenueByPaymentMethod: Record<string, number> = {};
    for (const o of orders) {
      for (const p of o.payments) {
        if (p.status !== PaymentStatus.PAID) continue;
        revenueByPaymentMethod[p.method] = round2((revenueByPaymentMethod[p.method] ?? 0) + Number(p.amount));
      }
    }

    const productStats = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const o of nonCancelled) {
      for (const item of o.items) {
        const key = item.productId;
        const current = productStats.get(key) ?? { name: item.product.name, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue = round2(current.revenue + Number(item.subtotal));
        productStats.set(key, current);
      }
    }
    const topProducts = [...productStats.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    const ordersByDay = new Map<string, { orders: number; revenue: number }>();
    for (const o of nonCancelled) {
      const day = o.createdAt.toISOString().slice(0, 10);
      const current = ordersByDay.get(day) ?? { orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue = round2(current.revenue + Number(o.total));
      ordersByDay.set(day, current);
    }

    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED && o.deliveredAt);
    const avgPrepMinutes = average(
      orders.filter((o) => o.acceptedAt && o.readyAt).map((o) => diffMinutes(o.acceptedAt!, o.readyAt!)),
    );
    const avgDeliveryMinutes = average(
      deliveredOrders.filter((o) => o.acceptedAt).map((o) => diffMinutes(o.acceptedAt!, o.deliveredAt!)),
    );

    return {
      period: { from, to },
      totalRevenue,
      orderCount: nonCancelled.length,
      cancelledCount: cancelled.length,
      averageTicket: nonCancelled.length > 0 ? round2(totalRevenue / nonCancelled.length) : 0,
      ordersByStatus,
      revenueByPaymentMethod,
      topProducts,
      ordersByDay: [...ordersByDay.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
      avgPrepMinutes,
      avgDeliveryMinutes,
    };
  }

  async exportOrdersCsv(companyId: string, params: { from?: Date; to?: Date }): Promise<string> {
    const from = params.from ?? startOfToday();
    const to = params.to ?? new Date();

    const orders = await this.prisma.order.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { customer: { include: { membership: { include: { user: { select: { name: true } } } } } } },
      orderBy: { createdAt: 'asc' },
    });

    const header = 'numero,data,cliente,tipo,status,subtotal,taxa_entrega,desconto,total\n';
    const rows = orders.map((o) =>
      [
        o.orderNumber,
        o.createdAt.toISOString(),
        `"${o.customer.membership.user.name.replace(/"/g, '""')}"`,
        o.type,
        o.status,
        o.subtotal,
        o.deliveryFee,
        o.discount,
        o.total,
      ].join(','),
    );

    return header + rows.join('\n');
  }
}

function diffMinutes(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 60000;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
