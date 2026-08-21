import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Central de notificações in-app. Os canais externos de verdade
// (WhatsApp, e-mail, push) ainda não têm um provedor conectado — assim
// como o PaymentsModule, esse é o ponto único que precisaria mudar para
// plugar um envio real (ex.: API do WhatsApp Business, um serviço de
// e-mail transacional). Por enquanto toda notificação também vira um
// registro que o cliente vê em "Minhas notificações".
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(params: {
    customerId: string;
    title: string;
    message: string;
    channel?: NotificationChannel;
  }) {
    // companyId é derivado do próprio customer (via a membership dele) em
    // vez de exigido como parâmetro — quem chama notify() normalmente já
    // só tem o customerId em mãos (ex.: PromotionsService varrendo
    // clientes de várias empresas), então isso evita ter que threadar
    // companyId por todo call site.
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: params.customerId },
      include: { membership: true },
    });

    return this.prisma.notification.create({
      data: {
        companyId: customer.membership.companyId,
        customerId: params.customerId,
        channel: params.channel ?? NotificationChannel.PUSH,
        title: params.title,
        message: params.message,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  findForCustomer(customerId: string) {
    return this.prisma.notification.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
