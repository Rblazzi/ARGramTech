import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OrderType, UserRole } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { DeliveryZonesService } from './delivery-zones.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { QuoteDeliveryFeeDto } from './dto/quote-delivery-fee.dto';

const MANAGE_ROLES = [UserRole.ADMIN, UserRole.MANAGER] as const;

@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(
    private readonly deliveryZonesService: DeliveryZonesService,
    private readonly cartService: CartService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.deliveryZonesService.findAllActive(companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_ROLES)
  @Get('admin')
  findAllForAdmin(@CurrentCompany() companyId: string) {
    return this.deliveryZonesService.findAllForAdmin(companyId);
  }

  // Preview do frete antes de confirmar o pedido, usando o subtotal do
  // carrinho atual do cliente.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post('quote')
  async quote(@CurrentUser() user: AuthenticatedUser, @Body() dto: QuoteDeliveryFeeDto) {
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, customerId: user.membershipId, deletedAt: null },
    });
    if (!address) throw new NotFoundException('Endereço não encontrado');

    const cart = await this.cartService.getSummary(user.membershipId);
    const fee = await this.deliveryZonesService.calculateFee({
      companyId: user.companyId,
      type: OrderType.DELIVERY,
      address,
      subtotal: cart.subtotal,
    });
    return { fee };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_ROLES)
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateDeliveryZoneDto) {
    return this.deliveryZonesService.create(companyId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_ROLES)
  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateDeliveryZoneDto) {
    return this.deliveryZonesService.update(companyId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_ROLES)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentCompany() companyId: string, @Param('id') id: string) {
    await this.deliveryZonesService.remove(companyId, id);
  }
}
