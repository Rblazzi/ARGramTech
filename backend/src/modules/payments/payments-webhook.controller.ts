import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { PaymentsService } from './payments.service';

// Compara em tempo constante pra não vazar, por diferença de tempo de
// resposta, quantos caracteres iniciais do segredo o chamador acertou.
function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

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
  async fakePixWebhook(@Headers('x-webhook-secret') secret: string | undefined, @Body() body: FakePixWebhookBody) {
    if (!secret || !secretsMatch(secret, this.config.get<string>('PIX_WEBHOOK_SECRET')!)) {
      throw new UnauthorizedException('Segredo de webhook inválido');
    }
    await this.paymentsService.confirmPayment(body.providerReference);
    return { received: true };
  }
}
