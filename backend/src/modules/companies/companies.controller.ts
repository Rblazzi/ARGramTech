import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  // Público de propósito: o frontend chama isso antes de qualquer login,
  // pra saber qual empresa é (pelo header X-Company-Slug/X-Site-Host que
  // ele mesmo manda) e montar o tema da página.
  @Get('resolve')
  resolve(@CurrentCompany() companyId: string) {
    return this.companiesService.resolveCurrent(companyId);
  }

  @UseGuards(PlatformAdminGuard)
  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }
}
