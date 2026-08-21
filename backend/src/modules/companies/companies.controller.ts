import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

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

  // A própria empresa edita a própria marca — sempre pela empresa da
  // request atual (nunca por id na URL, pra uma empresa nunca conseguir
  // editar outra).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('current')
  updateCurrent(@CurrentCompany() companyId: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.updateCurrent(companyId, dto);
  }
}
