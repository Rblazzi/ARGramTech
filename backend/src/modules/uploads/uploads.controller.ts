import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { UploadsService, MAX_UPLOAD_SIZE_BYTES } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // Upload de imagem da PRÓPRIA empresa (logo, banner, foto de
  // produto/categoria) — cada empresa só sobe pra sua própria pasta. O
  // limite de tamanho vai direto pro multer (não só checado depois no
  // service) pra rejeitar o upload durante o streaming, sem bufferizar
  // um arquivo gigante inteiro na memória antes de recusar.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File, @CurrentCompany() companyId: string) {
    const url = await this.uploadsService.uploadImage(file, `companies/${companyId}`);
    return { url };
  }
}
