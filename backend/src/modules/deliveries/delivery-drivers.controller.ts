import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { DeliveryDriversService } from './delivery-drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('delivery-drivers')
export class DeliveryDriversController {
  constructor(private readonly driversService: DeliveryDriversService) {}

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.driversService.findAll(companyId);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateDriverDto) {
    return this.driversService.create(companyId, dto);
  }

  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(companyId, id, dto);
  }
}
