import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const BUCKET = 'media';

// Encapsula o envio de imagens (logo/banner de empresa, foto de produto,
// imagens do site institucional) pro bucket público "media" do Supabase
// Storage. Único ponto do backend que fala com Storage — controllers só
// chamam uploadImage() com a pasta certa.
@Injectable()
export class UploadsService {
  constructor(private readonly supabase: SupabaseService) {}

  async uploadImage(file: Express.Multer.File | undefined, folder: string): Promise<string> {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('O arquivo precisa ser uma imagem');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('A imagem não pode passar de 5MB');
    }

    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'jpg';
    const path = `${folder}/${randomUUID()}.${ext}`;

    const { error } = await this.supabase.adminClient.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

    if (error) {
      throw new BadRequestException(`Falha ao enviar imagem: ${error.message}`);
    }

    const { data } = this.supabase.adminClient.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
}
