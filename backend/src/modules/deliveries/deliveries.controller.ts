import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DeliveriesService } from './deliveries.service';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { RateDeliveryDto } from './dto/rate-delivery.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Roles(UserRole.DRIVER)
  @Get('available')
  findAvailable(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.findAvailable(user.companyId);
  }

  @Roles(UserRole.DRIVER)
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.findMine(user.membershipId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin')
  findAllForAdmin(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.findAllForAdmin(user.companyId);
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveriesService.accept(user.companyId, user.membershipId, user.id, id);
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/picked-up')
  markPickedUp(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveriesService.markPickedUp(user.companyId, user.membershipId, id);
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/delivered')
  markDelivered(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveriesService.markDelivered(user.companyId, user.membershipId, user.id, id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/assign')
  assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignDeliveryDto) {
    return this.deliveriesService.assignManually(user.companyId, user.id, id, dto.driverId);
  }

  @Roles(UserRole.CUSTOMER)
  @Post(':id/rate')
  rate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RateDeliveryDto) {
    return this.deliveriesService.rate(user.companyId, user.membershipId, id, dto);
  }
}
