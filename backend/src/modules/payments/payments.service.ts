import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PIX_PROVIDER, PixProvider } from './providers/pix-provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService,
    @Inject(PIX_PROVIDER) private readonly pixProvider: PixProvider,
  ) {}

  async getForCustomer(customerId: string, paymentId: string) {
    return this.findOwnedOrThrow(customerId, paymentId);
  }

  // Gera (ou reaproveita, se ainda válido) a cobrança PIX de um pagamento.
  async generatePixCharge(customerId: string, paymentId: string) {
    const payment = await this.findOwnedOrThrow(customerId, paymentId);

    if (payment.method !== PaymentMethod.PIX) {
      throw new BadRequestException('Este pagamento não é via PIX');
    }
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Este pagamento já foi confirmado');
    }
    if (payment.pixCopyPaste && payment.expiresAt && payment.expiresAt > new Date()) {
      return payment; // ainda válido, não precisa gerar de novo
    }

    const txid = `PED${payment.order.orderNumber}`;
    const charge = await this.pixProvider.createCharge({ amount: Number(payment.amount), txid });

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        provider: 'fake-pix',
        providerReference: charge.providerReference,
        pixQrCode: charge.qrCodeDataUrl,
        pixCopyPaste: charge.copyPaste,
        expiresAt: charge.expiresAt,
      },
    });
  }

  // Chamado pelo webhook do provedor quando o pagamento é aprovado.
  // Idempotente: se já estava PAID, não faz nada.
  async confirmPayment(providerReference: string) {
    const payment = await this.prisma.payment.findFirst({ where: { providerReference } });
    if (!payment) throw new NotFoundException('Pagamento não encontrado para esta referência');
    if (payment.status === PaymentStatus.PAID) return payment;

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.PAID, paidAt: new Date() },
    });

    await this.ordersService.confirmPaymentReceived(payment.orderId);
    return updated;
  }

  // Ferramenta só para desenvolvimento local: simula o banco aprovando o
  // PIX, sem precisar de um webhook de verdade. NUNCA habilitar em
  // produção — a confirmação real tem que vir do gateway.
  async simulateApprovalForTesting(customerId: string, paymentId: string) {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Simulação de pagamento desabilitada em produção');
    }

    const payment = await this.findOwnedOrThrow(customerId, paymentId);
    if (!payment.providerReference) {
      throw new BadRequestException('Gere a cobrança PIX antes de simular a aprovação');
    }

    return this.confirmPayment(payment.providerReference);
  }

  private async findOwnedOrThrow(customerId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { select: { id: true, customerId: true, orderNumber: true } } },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (payment.order.customerId !== customerId) {
      throw new ForbiddenException('Este pagamento não pertence a você');
    }
    return payment;
  }
}
