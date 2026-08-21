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
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
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
  findAll(@CurrentCompany() companyId: string, @Query('categoryId') categoryId?: string) {
    return this.productsService.findAllActive(companyId, categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Get('admin')
  findAllForAdmin(@CurrentCompany() companyId: string, @Query('categoryId') categoryId?: string) {
    return this.productsService.findAllForAdmin(companyId, categoryId);
  }

  @Get(':id')
  findOne(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.productsService.findByIdOrThrow(companyId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(companyId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Patch(':id')
  update(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(companyId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentCompany() companyId: string, @Param('id') id: string) {
    await this.productsService.remove(companyId, id);
  }

  // --- Grupos de opções (ex.: "Adicionais", "Ponto da carne") ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Post(':productId/option-groups')
  createOptionGroup(
    @CurrentCompany() companyId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.productsService.createOptionGroup(companyId, productId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Patch('option-groups/:groupId')
  updateOptionGroup(
    @CurrentCompany() companyId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateOptionGroupDto,
  ) {
    return this.productsService.updateOptionGroup(companyId, groupId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Delete('option-groups/:groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOptionGroup(@CurrentCompany() companyId: string, @Param('groupId') groupId: string) {
    await this.productsService.removeOptionGroup(companyId, groupId);
  }

  // --- Itens de um grupo de opções (ex.: "Bacon", "Cheddar") ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Post('option-groups/:groupId/items')
  createOptionItem(
    @CurrentCompany() companyId: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateOptionItemDto,
  ) {
    return this.productsService.createOptionItem(companyId, groupId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Patch('option-items/:itemId')
  updateOptionItem(
    @CurrentCompany() companyId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOptionItemDto,
  ) {
    return this.productsService.updateOptionItem(companyId, itemId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MANAGE_PRODUCTS_ROLES)
  @Delete('option-items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOptionItem(@CurrentCompany() companyId: string, @Param('itemId') itemId: string) {
    await this.productsService.removeOptionItem(companyId, itemId);
  }
}
