import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildPixCopyPaste } from '../../../common/pix/pix-brcode.util';
import { PixCharge, PixProvider } from './pix-provider.interface';

const PIX_EXPIRATION_MINUTES = 30;

// Provedor de demonstração: NÃO se conecta a nenhum banco. Gera um
// payload "Pix Copia e Cola" real (formato EMVCo/Bacen) a partir da
// chave PIX cadastrada em StoreSettings — se essa chave for uma chave
// PIX de verdade, o código gerado é válido e pode ser escaneado. A
// "confirmação de pagamento" aqui é sempre manual (endpoint de
// simulação ou webhook) porque não há banco de verdade do outro lado.
//
// Para produção: implemente PixProvider com o SDK do gateway escolhido
// (Mercado Pago, PagSeguro, Stripe...) e troque o provider no
// PaymentsModule — nada mais no sistema precisa mudar.
@Injectable()
export class FakePixProvider implements PixProvider {
  constructor(private readonly prisma: PrismaService) {}

  async createCharge({ amount, txid }: { amount: number; txid: string }): Promise<PixCharge> {
    const settings = await this.prisma.storeSettings.findFirst();
    const pixKey = settings?.pixKey || 'chave-demo@lanchonetedelivery.com.br';
    const merchantName = settings?.name || 'Lanchonete Delivery';

    const copyPaste = buildPixCopyPaste({
      pixKey,
      merchantName,
      merchantCity: 'SAO PAULO',
      amount,
      txid,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(copyPaste, { margin: 1, width: 280 });
    const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60 * 1000);

    return {
      copyPaste,
      qrCodeDataUrl,
      providerReference: `fake-pix-${txid}-${Date.now()}`,
      expiresAt,
    };
  }
}
