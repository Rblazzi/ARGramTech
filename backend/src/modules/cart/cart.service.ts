import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CartStatus, CouponType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductWithOptionGroups, validateProductOptionSelection } from '../../common/product-options/option-selection.util';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

const CART_INCLUDE = {
  items: {
    include: {
      product: { include: { category: true } },
      selectedOptions: { include: { optionItem: true } },
    },
    orderBy: { createdAt: Prisma.SortOrder.asc },
  },
  coupon: true,
} satisfies Prisma.CartInclude;

type CartWithRelations = Prisma.CartGetPayload<{ include: typeof CART_INCLUDE }>;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // Cria o carrinho aberto do cliente se ele ainda não tiver um. Um
  // cliente só tem um carrinho OPEN por vez.
  private async getOrCreateOpenCart(customerId: string) {
    const existing = await this.prisma.cart.findFirst({
      where: { customerId, status: CartStatus.OPEN },
    });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { customerId, status: CartStatus.OPEN } });
  }

  async getSummary(customerId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { customerId, status: CartStatus.OPEN },
      include: CART_INCLUDE,
    });
    if (!cart) {
      return this.emptySummary();
    }
    return this.buildSummary(cart);
  }

  async addItem(customerId: string, dto: AddCartItemDto) {
    const cart = await this.getOrCreateOpenCart(customerId);
    const product = await this.findActiveProductOrThrow(dto.productId);
    const { unitPrice } = validateProductOptionSelection(product, dto.optionItemIds ?? []);

    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity,
        notes: dto.notes,
        unitPrice,
        selectedOptions: {
          create: (dto.optionItemIds ?? []).map((optionItemId) => ({ optionItemId })),
        },
      },
    });

    return this.getSummary(customerId);
  }

  async updateItem(customerId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.findOwnedItemOrThrow(customerId, itemId);
    const product = await this.findActiveProductOrThrow(item.productId);

    const optionItemIds =
      dto.optionItemIds ?? item.selectedOptions.map((selected) => selected.optionItemId);
    const { unitPrice } = validateProductOptionSelection(product, optionItemIds);

    if (dto.optionItemIds) {
      await this.prisma.cartItemOption.deleteMany({ where: { cartItemId: itemId } });
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity ?? item.quantity,
        notes: dto.notes ?? item.notes,
        unitPrice,
        ...(dto.optionItemIds && {
          selectedOptions: { create: dto.optionItemIds.map((optionItemId) => ({ optionItemId })) },
        }),
      },
    });

    return this.getSummary(customerId);
  }

  async removeItem(customerId: string, itemId: string) {
    await this.findOwnedItemOrThrow(customerId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getSummary(customerId);
  }

  async applyCoupon(customerId: string, code: string) {
    const cart = await this.getOrCreateOpenCart(customerId);
    const cartWithItems = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });

    if (cartWithItems.items.length === 0) {
      throw new BadRequestException('Adicione itens ao carrinho antes de aplicar um cupom');
    }

    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.active) {
      throw new BadRequestException('Cupom inválido');
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('Este cupom ainda não está disponível');
    }
    if (coupon.endsAt && now > coupon.endsAt) {
      throw new BadRequestException('Este cupom expirou');
    }

    const subtotal = this.computeSubtotal(cartWithItems);
    if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
      throw new BadRequestException(
        `Pedido mínimo de ${coupon.minOrderValue} para usar este cupom`,
      );
    }

    if (coupon.usageLimit != null) {
      const totalUses = await this.prisma.couponUsage.count({ where: { couponId: coupon.id } });
      if (totalUses >= coupon.usageLimit) {
        throw new BadRequestException('Este cupom já atingiu o limite de uso');
      }
    }

    if (coupon.usageLimitPerCustomer != null) {
      const customerUses = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, customerId },
      });
      if (customerUses >= coupon.usageLimitPerCustomer) {
        throw new BadRequestException('Você já utilizou este cupom o máximo de vezes permitido');
      }
    }

    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
    return this.getSummary(customerId);
  }

  async removeCoupon(customerId: string) {
    const cart = await this.getOrCreateOpenCart(customerId);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    return this.getSummary(customerId);
  }

  private async findActiveProductOrThrow(productId: string): Promise<ProductWithOptionGroups> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, active: true, deletedAt: null },
      include: { optionGroups: { include: { items: true } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado ou indisponível');
    return product;
  }

  private async findOwnedItemOrThrow(customerId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true, selectedOptions: true },
    });
    if (!item || item.cart.customerId !== customerId || item.cart.status !== CartStatus.OPEN) {
      throw new NotFoundException('Item do carrinho não encontrado');
    }
    return item;
  }

  private computeSubtotal(cart: CartWithRelations): number {
    return round2(
      cart.items.reduce((sum, item) => {
        const optionsTotal = item.selectedOptions.reduce(
          (s, opt) => s + Number(opt.optionItem.priceDelta),
          0,
        );
        const unitPrice = Number(item.product.price) + optionsTotal;
        return sum + unitPrice * item.quantity;
      }, 0),
    );
  }

  private buildSummary(cart: CartWithRelations) {
    const items = cart.items.map((item) => {
      const optionsTotal = item.selectedOptions.reduce(
        (s, opt) => s + Number(opt.optionItem.priceDelta),
        0,
      );
      const unitPrice = round2(Number(item.product.price) + optionsTotal);
      return {
        id: item.id,
        productId: item.productId,
        product: {
          id: item.product.id,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          category: item.product.category.name,
        },
        quantity: item.quantity,
        notes: item.notes,
        unitPrice,
        subtotal: round2(unitPrice * item.quantity),
        selectedOptions: item.selectedOptions.map((opt) => ({
          id: opt.optionItem.id,
          name: opt.optionItem.name,
          priceDelta: Number(opt.optionItem.priceDelta),
        })),
      };
    });

    const subtotal = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
    let discount = 0;
    let freeShipping = false;

    if (cart.coupon) {
      if (cart.coupon.type === CouponType.PERCENTAGE) {
        discount = round2(subtotal * (Number(cart.coupon.value) / 100));
      } else if (cart.coupon.type === CouponType.FIXED) {
        discount = Math.min(Number(cart.coupon.value), subtotal);
      } else if (cart.coupon.type === CouponType.FREE_SHIPPING) {
        freeShipping = true;
      }
    }

    // Taxa de entrega chega no módulo de Delivery Zones (próxima etapa).
    const deliveryFee = 0;
    const total = round2(subtotal - discount + deliveryFee);

    return {
      id: cart.id,
      items,
      subtotal,
      discount,
      deliveryFee,
      freeShipping,
      total,
      coupon: cart.coupon ? { code: cart.coupon.code, type: cart.coupon.type, value: Number(cart.coupon.value) } : null,
    };
  }

  private emptySummary() {
    return {
      id: null,
      items: [] as ReturnType<CartService['buildSummary']>['items'],
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      freeShipping: false,
      total: 0,
      coupon: null,
    };
  }
}
