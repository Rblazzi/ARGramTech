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
  findAvailable() {
    return this.deliveriesService.findAvailable();
  }

  @Roles(UserRole.DRIVER)
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.findMine(user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get('admin')
  findAllForAdmin() {
    return this.deliveriesService.findAllForAdmin();
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveriesService.accept(user.id, id);
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/picked-up')
  markPickedUp(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveriesService.markPickedUp(user.id, id);
  }

  @Roles(UserRole.DRIVER)
  @Post(':id/delivered')
  markDelivered(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveriesService.markDelivered(user.id, id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/assign')
  assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignDeliveryDto) {
    return this.deliveriesService.assignManually(user.id, id, dto.driverId);
  }

  @Roles(UserRole.CUSTOMER)
  @Post(':id/rate')
  rate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RateDeliveryDto) {
    return this.deliveriesService.rate(user.id, id, dto);
  }
}
