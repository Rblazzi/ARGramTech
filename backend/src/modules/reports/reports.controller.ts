import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { ReportsService } from './reports.service';

function parseDate(value?: string): Date | undefined {
  return value ? new Date(value) : undefined;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  getSales(@CurrentCompany() companyId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getSalesSummary(companyId, { from: parseDate(from), to: parseDate(to) });
  }

  @Get('sales/export')
  async exportSales(
    @CurrentCompany() companyId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.reportsService.exportOrdersCsv(companyId, { from: parseDate(from), to: parseDate(to) });
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="pedidos.csv"');
    return csv;
  }
}
