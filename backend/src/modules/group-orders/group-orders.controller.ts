import { Body, Controller, Get, Param, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { GroupOrdersService } from './group-orders.service';
import { CreateGroupOrderDto } from './dto/create-group-order.dto';
import { AddGroupItemDto } from './dto/add-group-item.dto';
import { UpdateGroupItemDto } from './dto/update-group-item.dto';
import { LockGroupOrderDto } from './dto/lock-group-order.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('group-orders')
export class GroupOrdersController {
  constructor(private readonly groupOrdersService: GroupOrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGroupOrderDto) {
    return this.groupOrdersService.create(user.id, dto);
  }

  @Get(':code')
  getView(@Param('code') code: string) {
    return this.groupOrdersService.getView(code);
  }

  @Post(':code/join')
  join(@CurrentUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.groupOrdersService.join(code, user.id);
  }

  @Post(':code/items')
  addItem(@CurrentUser() user: AuthenticatedUser, @Param('code') code: string, @Body() dto: AddGroupItemDto) {
    return this.groupOrdersService.addItem(code, user.id, dto);
  }

  @Patch(':code/items/:itemId')
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('code') code: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateGroupItemDto,
  ) {
    return this.groupOrdersService.updateItem(code, user.id, itemId, dto);
  }

  @Delete(':code/items/:itemId')
  removeItem(@CurrentUser() user: AuthenticatedUser, @Param('code') code: string, @Param('itemId') itemId: string) {
    return this.groupOrdersService.removeItem(code, user.id, itemId);
  }

  @Post(':code/lock')
  lock(@CurrentUser() user: AuthenticatedUser, @Param('code') code: string, @Body() dto: LockGroupOrderDto) {
    return this.groupOrdersService.lock(code, user.id, dto);
  }

  @Post(':code/splits/:splitId/pay')
  paySplit(@CurrentUser() user: AuthenticatedUser, @Param('code') code: string, @Param('splitId') splitId: string) {
    return this.groupOrdersService.paySplit(code, user.id, splitId);
  }

  @Post(':code/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.groupOrdersService.cancel(code, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':code/release')
  release(@CurrentUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.groupOrdersService.releaseManually(code, user.id);
  }
}
