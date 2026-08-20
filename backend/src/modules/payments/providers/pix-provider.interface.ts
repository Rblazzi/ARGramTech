// Contrato que qualquer provedor de PIX precisa implementar. O resto do
// sistema (PaymentsService, controllers) só conhece esta interface —
// trocar o FakePixProvider por um gateway de verdade (Mercado Pago,
// PagSeguro, etc.) não exige mudar nada fora de /providers.
export interface PixCharge {
  copyPaste: string;
  qrCodeDataUrl: string;
  providerReference: string;
  expiresAt: Date;
}

export interface PixProvider {
  createCharge(params: { amount: number; txid: string }): Promise<PixCharge>;
}

export const PIX_PROVIDER = Symbol('PIX_PROVIDER');
