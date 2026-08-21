import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.promotionsService.findAll(companyId);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(companyId, dto);
  }

  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentCompany() companyId: string, @Param('id') id: string) {
    await this.promotionsService.remove(companyId, id);
  }

  // Dispara a avaliação na hora, sem esperar o cron das 9h — útil para
  // testar, só para a empresa de quem chamou.
  @Post('run-now')
  @HttpCode(HttpStatus.OK)
  async runNow(@CurrentCompany() companyId: string) {
    await this.promotionsService.runNow(companyId);
    return { message: 'Promoções avaliadas' };
  }
}
