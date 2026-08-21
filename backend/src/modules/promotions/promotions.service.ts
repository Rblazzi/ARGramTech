import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PromotionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

const BIRTHDAY_TITLE = 'Feliz aniversário! 🎉';
const INACTIVE_TITLE = 'Sentimos sua falta!';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(companyId: string) {
    return this.prisma.promotion.findMany({ where: { companyId }, include: { coupon: true }, orderBy: { createdAt: 'desc' } });
  }

  async findByIdOrThrow(companyId: string, id: string) {
    const promotion = await this.prisma.promotion.findFirst({ where: { id, companyId } });
    if (!promotion) throw new NotFoundException('Promoção não encontrada');
    return promotion;
  }

  create(companyId: string, dto: CreatePromotionDto) {
    return this.prisma.promotion.create({ data: { ...dto, companyId, active: dto.active ?? true } });
  }

  async update(companyId: string, id: string, dto: UpdatePromotionDto) {
    await this.findByIdOrThrow(companyId, id);
    return this.prisma.promotion.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findByIdOrThrow(companyId, id);
    await this.prisma.promotion.update({ where: { id }, data: { active: false } });
  }

  // Disparo manual (endpoint de admin) — avalia só a empresa que pediu.
  runNow(companyId: string) {
    return this.runForCompany(companyId);
  }

  // Roda todo dia às 9h, para TODAS as empresas ativas. Avalia as
  // promoções baseadas em tempo (aniversário, cliente inativo) e
  // notifica quem se encaixa. A promoção por valor mínimo do pedido é
  // reativa (checada na hora que o pedido é criado, em OrdersService),
  // não por aqui.
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runScheduledPromotions() {
    const companies = await this.prisma.company.findMany({ where: { active: true } });
    for (const company of companies) {
      await this.runForCompany(company.id);
    }
  }

  private async runForCompany(companyId: string) {
    const promotions = await this.prisma.promotion.findMany({
      where: { active: true, companyId },
      include: { coupon: true },
    });

    for (const promotion of promotions) {
      if (promotion.type === PromotionType.BIRTHDAY) {
        await this.notifyBirthdays(companyId, promotion.coupon?.code);
      } else if (promotion.type === PromotionType.INACTIVE_CUSTOMER) {
        const ruleConfig = promotion.ruleConfig as Record<string, number> | null;
        const days = Number(ruleConfig?.days ?? 30);
        await this.notifyInactiveCustomers(companyId, days, promotion.coupon?.code);
      }
    }
  }

  private async notifyBirthdays(companyId: string, couponCode?: string) {
    const today = new Date();
    const customers = await this.prisma.customer.findMany({
      where: { birthDate: { not: null }, membership: { companyId } },
    });

    const birthdayToday = customers.filter((c) => {
      const b = c.birthDate!;
      return b.getUTCMonth() === today.getUTCMonth() && b.getUTCDate() === today.getUTCDate();
    });

    for (const customer of birthdayToday) {
      const alreadyNotified = await this.wasNotifiedRecently(customer.id, BIRTHDAY_TITLE, 300);
      if (alreadyNotified) continue;

      await this.notifications.notify({
        customerId: customer.id,
        title: BIRTHDAY_TITLE,
        message: couponCode
          ? `Parabéns! Use o cupom ${couponCode} no seu próximo pedido, é nosso presente para você.`
          : 'Parabéns! A equipe da lanchonete deseja um ótimo dia para você.',
      });
    }

    this.logger.log(`Promoção de aniversário: ${birthdayToday.length} cliente(s) verificado(s) hoje`);
  }

  private async notifyInactiveCustomers(companyId: string, days: number, couponCode?: string) {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const inactiveCustomers = await this.prisma.customer.findMany({
      where: { lastOrderAt: { lt: threshold }, membership: { companyId } },
    });

    for (const customer of inactiveCustomers) {
      const alreadyNotified = await this.wasNotifiedRecently(customer.id, INACTIVE_TITLE, days);
      if (alreadyNotified) continue;

      await this.notifications.notify({
        customerId: customer.id,
        title: INACTIVE_TITLE,
        message: couponCode
          ? `Faz tempo que você não pede com a gente! Use o cupom ${couponCode} e volte pra experimentar as novidades.`
          : 'Faz tempo que você não pede com a gente! Dá uma olhada nas novidades do cardápio.',
      });
    }

    this.logger.log(`Promoção de cliente inativo: ${inactiveCustomers.length} cliente(s) notificado(s)`);
  }

  private async wasNotifiedRecently(customerId: string, title: string, days: number): Promise<boolean> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const existing = await this.prisma.notification.findFirst({
      where: { customerId, title, createdAt: { gte: since } },
    });
    return Boolean(existing);
  }
}
