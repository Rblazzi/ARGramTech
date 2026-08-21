import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto';

// Restrito a ADMIN (não MANAGER) de propósito — gerenciar quem tem
// acesso ao sistema e redefinir senha é mais sensível que o resto do
// admin, onde MANAGER também tem permissão.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.staffService.findAll(companyId);
  }

  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateStaffDto) {
    return this.staffService.create(companyId, dto);
  }

  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(companyId, id, user.membershipId, dto);
  }

  @Post(':id/reset-password')
  resetPassword(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: ResetStaffPasswordDto) {
    return this.staffService.resetPassword(companyId, id, dto.newPassword);
  }
}
