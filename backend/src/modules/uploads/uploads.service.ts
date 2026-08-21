import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const BUCKET = 'media';

// Assinaturas (magic bytes) dos formatos de imagem raster aceitos.
// Verificar isso é o que impede alguém de subir um SVG/HTML disfarçado
// de "image/png" pelo Content-Type (que é só o que o cliente diz que é,
// não o que o arquivo realmente é) — o resultado vai pro bucket público,
// então um arquivo malicioso vira XSS hospedado na nossa própria
// infraestrutura. SVG é recusado de propósito: é XML/texto, não um
// formato raster, e é o vetor clássico de XSS via upload de "imagem".
const IMAGE_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF" (WEBP confirmado abaixo pelos bytes 8-11)
];

function detectImageMime(buffer: Buffer): string | null {
  for (const { mime, bytes } of IMAGE_SIGNATURES) {
    if (buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b)) {
      if (mime === 'image/webp') {
        // RIFF é um container genérico — só é WEBP se os bytes 8-11 forem "WEBP".
        if (buffer.length >= 12 && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return mime;
        continue;
      }
      return mime;
    }
  }
  return null;
}

// Encapsula o envio de imagens (logo/banner de empresa, foto de produto,
// imagens do site institucional) pro bucket público "media" do Supabase
// Storage. Único ponto do backend que fala com Storage — controllers só
// chamam uploadImage() com a pasta certa.
@Injectable()
export class UploadsService {
  constructor(private readonly supabase: SupabaseService) {}

  async uploadImage(file: Express.Multer.File | undefined, folder: string): Promise<string> {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('A imagem não pode passar de 5MB');
    }

    const detectedMime = detectImageMime(file.buffer);
    if (!detectedMime) {
      throw new BadRequestException('O arquivo precisa ser uma imagem válida (PNG, JPEG, GIF ou WEBP)');
    }

    const ext = detectedMime.split('/')[1];
    const path = `${folder}/${randomUUID()}.${ext}`;

    const { error } = await this.supabase.adminClient.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: detectedMime, upsert: true });

    if (error) {
      throw new BadRequestException(`Falha ao enviar imagem: ${error.message}`);
    }

    const { data } = this.supabase.adminClient.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
