import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';
import { CreateOptionItemDto } from './dto/create-option-item.dto';
import { UpdateOptionItemDto } from './dto/update-option-item.dto';

// Inclui categoria + grupos de opções + itens de cada grupo, sempre
// ordenados por `position`, para o cliente montar a tela do produto
// direto com o que a API devolve.
const PRODUCT_INCLUDE = {
  category: true,
  optionGroups: {
    orderBy: { position: Prisma.SortOrder.asc },
    include: { items: { orderBy: { position: Prisma.SortOrder.asc } } },
  },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive(categoryId?: string) {
    return this.prisma.product.findMany({
      where: { active: true, deletedAt: null, categoryId },
      include: PRODUCT_INCLUDE,
      orderBy: { position: 'asc' },
    });
  }

  findAllForAdmin(categoryId?: string) {
    return this.prisma.product.findMany({
      where: { deletedAt: null, categoryId },
      include: PRODUCT_INCLUDE,
      orderBy: { position: 'asc' },
    });
  }

  async findByIdOrThrow(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async create(dto: CreateProductDto) {
    await this.assertInternalCodeAvailable(dto.internalCode);
    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        price: dto.price,
        prepTimeMinutes: dto.prepTimeMinutes ?? 15,
        internalCode: dto.internalCode,
        position: dto.position ?? 0,
        active: dto.active ?? true,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findByIdOrThrow(id);
    if (dto.internalCode) {
      await this.assertInternalCodeAvailable(dto.internalCode, id);
    }
    return this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        price: dto.price,
        prepTimeMinutes: dto.prepTimeMinutes,
        internalCode: dto.internalCode,
        position: dto.position,
        active: dto.active,
      },
      include: PRODUCT_INCLUDE,
    });
  }

  // Soft delete: mantém o histórico de pedidos que já referenciam o produto.
  async remove(id: string) {
    await this.findByIdOrThrow(id);
    await this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  }

  async createOptionGroup(productId: string, dto: CreateOptionGroupDto) {
    await this.findByIdOrThrow(productId);
    return this.prisma.productOptionGroup.create({
      data: {
        productId,
        name: dto.name,
        required: dto.required ?? false,
        selectionType: dto.selectionType ?? 'SINGLE',
        minSelect: dto.minSelect ?? 0,
        maxSelect: dto.maxSelect ?? 1,
        position: dto.position ?? 0,
      },
      include: { items: true },
    });
  }

  async updateOptionGroup(groupId: string, dto: UpdateOptionGroupDto) {
    await this.findOptionGroupOrThrow(groupId);
    return this.prisma.productOptionGroup.update({
      where: { id: groupId },
      data: dto,
      include: { items: true },
    });
  }

  async removeOptionGroup(groupId: string) {
    await this.findOptionGroupOrThrow(groupId);
    // Grupo e itens não têm pedidos históricos apontando direto para eles
    // (pedidos guardam um snapshot em order_item_options), então aqui é
    // exclusão definitiva mesmo, não soft delete.
    await this.prisma.productOptionGroup.delete({ where: { id: groupId } });
  }

  async createOptionItem(groupId: string, dto: CreateOptionItemDto) {
    await this.findOptionGroupOrThrow(groupId);
    return this.prisma.productOptionItem.create({
      data: {
        groupId,
        name: dto.name,
        priceDelta: dto.priceDelta ?? 0,
        active: dto.active ?? true,
        position: dto.position ?? 0,
      },
    });
  }

  async updateOptionItem(itemId: string, dto: UpdateOptionItemDto) {
    await this.findOptionItemOrThrow(itemId);
    return this.prisma.productOptionItem.update({ where: { id: itemId }, data: dto });
  }

  async removeOptionItem(itemId: string) {
    await this.findOptionItemOrThrow(itemId);
    await this.prisma.productOptionItem.delete({ where: { id: itemId } });
  }

  private async assertInternalCodeAvailable(internalCode: string, ignoreProductId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { internalCode } });
    if (existing && existing.id !== ignoreProductId) {
      throw new ConflictException('Já existe um produto com este código interno');
    }
  }

  private async findOptionGroupOrThrow(groupId: string) {
    const group = await this.prisma.productOptionGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo de opções não encontrado');
    return group;
  }

  private async findOptionItemOrThrow(itemId: string) {
    const item = await this.prisma.productOptionItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item de opção não encontrado');
    return item;
  }
}
