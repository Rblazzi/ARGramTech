// Gera o payload "Pix Copia e Cola" no formato EMVCo/Bacen (BR Code
// estático, com valor fixo). Qualquer app de banco consegue ler este
// código — não é um mock, é o formato real usado pelo PIX.
// Referência: Manual de Padrões para Iniciação do Pix (Bacen).

interface PixPayloadInput {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid: string;
}

function tlv(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

// Remove acentos/caracteres fora do padrão exigido pelo BR Code (ASCII,
// maiúsculas para nome/cidade) e trunca no tamanho máximo do campo.
function sanitize(text: string, maxLength: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, maxLength)
    .trim();
}

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) — exigido como
// último campo do payload para validar integridade.
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixCopyPaste(input: PixPayloadInput): string {
  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', input.pixKey);
  const additionalData = tlv('05', sanitize(input.txid, 25) || '***');

  const payloadWithoutCrc =
    tlv('00', '01') + // Payload Format Indicator
    tlv('26', merchantAccountInfo) + // Merchant Account Information (Pix)
    tlv('52', '0000') + // Merchant Category Code
    tlv('53', '986') + // Transaction Currency (BRL)
    tlv('54', input.amount.toFixed(2)) + // Transaction Amount
    tlv('58', 'BR') + // Country Code
    tlv('59', sanitize(input.merchantName, 25) || 'LANCHONETE') + // Merchant Name
    tlv('60', sanitize(input.merchantCity, 15) || 'SAO PAULO') + // Merchant City
    tlv('62', additionalData) + // Additional Data Field Template
    '6304'; // CRC placeholder (id + length, valor calculado a seguir)

  return payloadWithoutCrc + crc16(payloadWithoutCrc);
}
