import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

interface FakePixWebhookBody {
  providerReference: string;
}

// Endpoint que um gateway de verdade chamaria de forma assíncrona para
// avisar que um pagamento foi aprovado. Fica fora do JwtAuthGuard de
// propósito — o provedor externo não tem (nem deveria ter) um token de
// usuário nosso. Em vez disso, valida um segredo compartilhado.
// Um gateway real (Mercado Pago, PagSeguro...) teria seu próprio
// mecanismo de assinatura de webhook — trocar essa validação é o único
// ajuste necessário para usar um provider de verdade.
@Controller('payments/webhook')
export class PaymentsWebhookController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post('fake-pix')
  @HttpCode(HttpStatus.OK)
  async fakePixWebhook(@Headers('x-webhook-secret') secret: string, @Body() body: FakePixWebhookBody) {
    if (secret !== this.config.get<string>('PIX_WEBHOOK_SECRET')) {
      throw new UnauthorizedException('Segredo de webhook inválido');
    }
    await this.paymentsService.confirmPayment(body.providerReference);
    return { received: true };
  }
}
