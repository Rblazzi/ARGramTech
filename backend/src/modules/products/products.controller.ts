import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';
import { CreateOptionItemDto } from './dto/create-option-item.dto';
import { UpdateOptionItemDto } from './dto/update-option-item.dto';

const MANAGE_PRODUCTS_ROLES = [UserRole.ADMIN, UserRole.MANAGER] as const;

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Rota pública (cardápio do cliente): só produtos ativos.
  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    return this.productsService.findAllActive(categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Get('admin')
  findAllForAdmin(@Query('categoryId') categoryId?: string) {
    return this.productsService.findAllForAdmin(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findByIdOrThrow(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.productsService.remove(id);
  }

  // --- Grupos de opções (ex.: "Adicionais", "Ponto da carne") ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Post(':productId/option-groups')
  createOptionGroup(@Param('productId') productId: string, @Body() dto: CreateOptionGroupDto) {
    return this.productsService.createOptionGroup(productId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Patch('option-groups/:groupId')
  updateOptionGroup(@Param('groupId') groupId: string, @Body() dto: UpdateOptionGroupDto) {
    return this.productsService.updateOptionGroup(groupId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Delete('option-groups/:groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOptionGroup(@Param('groupId') groupId: string) {
    await this.productsService.removeOptionGroup(groupId);
  }

  // --- Itens de um grupo de opções (ex.: "Bacon", "Cheddar") ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Post('option-groups/:groupId/items')
  createOptionItem(@Param('groupId') groupId: string, @Body() dto: CreateOptionItemDto) {
    return this.productsService.createOptionItem(groupId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Patch('option-items/:itemId')
  updateOptionItem(@Param('itemId') itemId: string, @Body() dto: UpdateOptionItemDto) {
    return this.productsService.updateOptionItem(itemId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Delete('option-items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOptionItem(@Param('itemId') itemId: string) {
    await this.productsService.removeOptionItem(itemId);
  }
}
