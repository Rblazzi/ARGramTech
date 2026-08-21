import { Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CurrentPlatformUser } from '../../common/decorators/current-platform-user.decorator';
import { CreateCompanyDto } from '../companies/dto/create-company.dto';
import { UploadsService } from '../uploads/uploads.service';
import { PlatformService } from './platform.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';

@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post('login')
  login(@Body() dto: PlatformLoginDto) {
    return this.platformService.login(dto);
  }

  @UseGuards(PlatformAdminGuard)
  @Get('me')
  me(@CurrentPlatformUser() user: User) {
    return { id: user.id, email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin };
  }

  @UseGuards(PlatformAdminGuard)
  @Get('companies')
  listCompanies() {
    return this.platformService.listCompanies();
  }

  @UseGuards(PlatformAdminGuard)
  @Post('companies')
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.platformService.createCompany(dto);
  }

  // Público de propósito: é o que o site institucional estático (sem
  // login nenhum) chama pra montar os textos/logo editáveis.
  @Get('site-content')
  getSiteContent() {
    return this.platformService.getSiteContent();
  }

  @UseGuards(PlatformAdminGuard)
  @Patch('site-content')
  updateSiteContent(@Body() dto: UpdateSiteContentDto) {
    return this.platformService.updateSiteContent(dto);
  }

  // Upload de imagem do dono da plataforma (hoje só o logo do site
  // institucional) — pasta separada da de qualquer empresa.
  @UseGuards(PlatformAdminGuard)
  @Post('uploads/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.uploadsService.uploadImage(file, 'platform/site-content');
    return { url };
  }
}
