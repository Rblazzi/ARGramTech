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
    return this.prisma.notification.create({
      data: {
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
