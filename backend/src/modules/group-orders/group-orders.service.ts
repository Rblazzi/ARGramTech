import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Address, GroupOrderStatus, OrderStatus, OrderType, PaymentMode, Prisma, SplitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { validateProductOptionSelection } from '../../common/product-options/option-selection.util';
import { splitByWeights } from '../../common/money/split.util';
import { DeliveryZonesService } from '../delivery-zones/delivery-zones.service';
import { CreateGroupOrderDto } from './dto/create-group-order.dto';
import { AddGroupItemDto } from './dto/add-group-item.dto';
import { UpdateGroupItemDto } from './dto/update-group-item.dto';
import { LockGroupOrderDto } from './dto/lock-group-order.dto';

const GROUP_INCLUDE = {
  members: {
    include: { customer: { include: { user: { select: { name: true } } } } },
    orderBy: { joinedAt: Prisma.SortOrder.asc },
  },
  order: {
    include: {
      items: {
        include: { product: { select: { name: true, imageUrl: true } }, selectedOptions: true },
        orderBy: { createdAt: Prisma.SortOrder.asc },
      },
      paymentSplits: true,
    },
  },
} satisfies Prisma.GroupOrderInclude;

// `order` é opcional no schema (relação 1:1 opcional do lado do
// GroupOrder), mas na prática sempre existe — é criado junto no
// create(). findByCodeOrThrow() garante isso em runtime, então o tipo
// aqui já reflete `order` como não-nulo para o resto do service.
type GroupWithRelations = Omit<Prisma.GroupOrderGetPayload<{ include: typeof GROUP_INCLUDE }>, 'order'> & {
  order: NonNullable<Prisma.GroupOrderGetPayload<{ include: typeof GROUP_INCLUDE }>['order']>;
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1 pra evitar confusão

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class GroupOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryZonesService: DeliveryZonesService,
  ) {}

  async create(customerId: string, dto: CreateGroupOrderDto) {
    const code = await this.generateUniqueCode();
    const paymentMode = dto.paymentMode ?? PaymentMode.SPLIT_BY_CONSUMPTION;
    const deliveryFeeSplitMode = dto.deliveryFeeSplitMode ?? 'EQUAL';

    await this.prisma.groupOrder.create({
      data: {
        code,
        ownerCustomerId: customerId,
        paymentMode,
        deliveryFeeSplitMode,
        members: { create: { customerId, role: 'OWNER' } },
        order: {
          create: {
            customerId,
            type: OrderType.PICKUP, // provisório — definido de verdade no lock()
            status: OrderStatus.RECEIVED,
            paymentMode,
            subtotal: 0,
            deliveryFee: 0,
            discount: 0,
            total: 0,
          },
        },
      },
    });

    return this.getView(code);
  }

  async getView(code: string) {
    const group = await this.findByCodeOrThrow(code);
    return this.buildView(group);
  }

  async join(code: string, customerId: string) {
    const group = await this.findByCodeOrThrow(code);
    if (group.status !== GroupOrderStatus.OPEN) {
      throw new BadRequestException('Este pedido em grupo não está mais aberto para novos participantes');
    }

    const alreadyMember = group.members.some((m) => m.customerId === customerId);
    if (!alreadyMember) {
      await this.prisma.groupOrderMember.create({
        data: { groupOrderId: group.id, customerId, role: 'MEMBER' },
      });
    }

    return this.getView(code);
  }

  async addItem(code: string, customerId: string, dto: AddGroupItemDto) {
    const group = await this.findByCodeOrThrow(code);
    this.assertOpen(group);
    const member = this.findMemberOrThrow(group, customerId);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, active: true, deletedAt: null },
      include: { optionGroups: { include: { items: true } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado ou indisponível');

    const { unitPrice } = validateProductOptionSelection(product, dto.optionItemIds ?? []);

    await this.prisma.orderItem.create({
      data: {
        orderId: group.order.id,
        productId: product.id,
        groupOrderMemberId: member.id,
        quantity: dto.quantity,
        unitPrice,
        subtotal: round2(unitPrice * dto.quantity),
        notes: dto.notes,
        selectedOptions: {
          create: (dto.optionItemIds ?? []).map((optionItemId) => {
            const item = product.optionGroups.flatMap((g) => g.items).find((i) => i.id === optionItemId)!;
            return { optionItemId, nameSnapshot: item.name, priceDeltaSnapshot: item.priceDelta };
          }),
        },
      },
    });

    await this.recomputeOrderTotals(group.order.id);
    return this.getView(code);
  }

  async updateItem(code: string, customerId: string, itemId: string, dto: UpdateGroupItemDto) {
    const group = await this.findByCodeOrThrow(code);
    this.assertOpen(group);
    const item = this.findOwnedItemOrThrow(group, customerId, itemId);

    const product = await this.prisma.product.findFirst({
      where: { id: item.productId, active: true, deletedAt: null },
      include: { optionGroups: { include: { items: true } } },
    });
    if (!product) throw new NotFoundException('Produto não encontrado ou indisponível');

    const optionItemIds = dto.optionItemIds ?? item.selectedOptions.map((o) => o.optionItemId);
    const { unitPrice } = validateProductOptionSelection(product, optionItemIds);
    const quantity = dto.quantity ?? item.quantity;

    if (dto.optionItemIds) {
      await this.prisma.orderItemOption.deleteMany({ where: { orderItemId: itemId } });
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity,
        notes: dto.notes ?? item.notes,
        unitPrice,
        subtotal: round2(unitPrice * quantity),
        ...(dto.optionItemIds && {
          selectedOptions: {
            create: dto.optionItemIds.map((optionItemId) => {
              const optItem = product.optionGroups.flatMap((g) => g.items).find((i) => i.id === optionItemId)!;
              return { optionItemId, nameSnapshot: optItem.name, priceDeltaSnapshot: optItem.priceDelta };
            }),
          },
        }),
      },
    });

    await this.recomputeOrderTotals(group.order.id);
    return this.getView(code);
  }

  async removeItem(code: string, customerId: string, itemId: string) {
    const group = await this.findByCodeOrThrow(code);
    this.assertOpen(group);
    this.findOwnedItemOrThrow(group, customerId, itemId);

    await this.prisma.orderItem.delete({ where: { id: itemId } });
    await this.recomputeOrderTotals(group.order.id);
    return this.getView(code);
  }

  async lock(code: string, customerId: string, dto: LockGroupOrderDto) {
    const group = await this.findByCodeOrThrow(code);
    if (group.ownerCustomerId !== customerId) {
      throw new ForbiddenException('Só quem criou o pedido em grupo pode fechá-lo');
    }
    this.assertOpen(group);
    if (group.order.items.length === 0) {
      throw new BadRequestException('Adicione pelo menos um item antes de fechar o pedido');
    }

    let address: Address | null = null;
    if (dto.type === OrderType.DELIVERY) {
      address = await this.prisma.address.findFirst({
        where: { id: dto.addressId, customerId, deletedAt: null },
      });
      if (!address) throw new BadRequestException('Endereço de entrega inválido');
    }

    const itemsSubtotal = round2(group.order.items.reduce((sum, item) => sum + Number(item.subtotal), 0));
    const deliveryFee = await this.deliveryZonesService.calculateFee({ type: dto.type, address, subtotal: itemsSubtotal });
    const total = round2(itemsSubtotal + deliveryFee);

    const splits = this.computeSplits(group, itemsSubtotal, deliveryFee, dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: group.order.id },
        data: {
          type: dto.type,
          addressId: dto.type === OrderType.DELIVERY ? dto.addressId : null,
          deliveryFee,
          subtotal: itemsSubtotal,
          total,
        },
      });

      await tx.paymentSplit.createMany({
        data: splits.map((split) => ({
          orderId: group.order.id,
          groupOrderMemberId: split.memberId,
          customerId: split.customerId,
          participantName: split.name,
          amountDue: split.amount,
          status: split.amount === 0 ? SplitStatus.PAID : SplitStatus.AWAITING_PAYMENT,
          amountPaid: split.amount === 0 ? split.amount : 0,
        })),
      });

      await tx.groupOrder.update({ where: { id: group.id }, data: { status: GroupOrderStatus.LOCKED } });
    });

    await this.maybeAutoConfirm(group.id);
    return this.getView(code);
  }

  async paySplit(code: string, customerId: string, splitId: string) {
    const group = await this.findByCodeOrThrow(code);
    if (group.status !== GroupOrderStatus.LOCKED) {
      throw new BadRequestException('Este pedido em grupo ainda não foi fechado para pagamento');
    }

    const split = group.order.paymentSplits.find((s) => s.id === splitId);
    if (!split) throw new NotFoundException('Cobrança não encontrada');
    if (split.customerId !== customerId) {
      throw new ForbiddenException('Você só pode confirmar o pagamento da sua própria parte');
    }
    if (split.status === SplitStatus.PAID) return this.getView(code);

    // Simula a confirmação de pagamento (autorrelato). A integração real
    // com gateway/PIX entra no módulo de pagamentos.
    await this.prisma.paymentSplit.update({
      where: { id: splitId },
      data: { status: SplitStatus.PAID, amountPaid: split.amountDue },
    });

    await this.maybeAutoConfirm(group.id);
    return this.getView(code);
  }

  async releaseManually(code: string, staffUserId: string) {
    const group = await this.findByCodeOrThrow(code);
    if (group.status !== GroupOrderStatus.LOCKED) {
      throw new BadRequestException('Este pedido em grupo não está aguardando liberação');
    }

    await this.prisma.$transaction([
      this.prisma.groupOrder.update({ where: { id: group.id }, data: { status: GroupOrderStatus.CONFIRMED } }),
      this.prisma.order.update({
        where: { id: group.order.id },
        data: {
          releasedToKitchenManually: true,
          statusHistory: {
            create: {
              status: group.order.status,
              changedByUserId: staffUserId,
              note: 'Liberado manualmente pelo administrador com pagamentos pendentes',
            },
          },
        },
      }),
    ]);

    return this.getView(code);
  }

  async cancel(code: string, customerId: string) {
    const group = await this.findByCodeOrThrow(code);
    if (group.ownerCustomerId !== customerId) {
      throw new ForbiddenException('Só quem criou o pedido em grupo pode cancelá-lo');
    }
    if (group.status === GroupOrderStatus.CONFIRMED) {
      throw new BadRequestException('Não é possível cancelar um pedido já liberado para a cozinha');
    }

    await this.prisma.$transaction([
      this.prisma.groupOrder.update({ where: { id: group.id }, data: { status: GroupOrderStatus.CANCELLED } }),
      this.prisma.order.update({
        where: { id: group.order.id },
        data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
      }),
    ]);

    return this.getView(code);
  }

  // ------------------------------------------------------------------

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
      const existing = await this.prisma.groupOrder.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('Não foi possível gerar um código único para o pedido em grupo');
  }

  private async findByCodeOrThrow(code: string): Promise<GroupWithRelations> {
    const group = await this.prisma.groupOrder.findUnique({
      where: { code: code.toUpperCase() },
      include: GROUP_INCLUDE,
    });
    if (!group) throw new NotFoundException('Pedido em grupo não encontrado');
    if (!group.order) throw new Error(`GroupOrder ${group.id} está sem Order associado — dado inconsistente`);
    return group as GroupWithRelations;
  }

  private assertOpen(group: GroupWithRelations) {
    if (group.status !== GroupOrderStatus.OPEN) {
      throw new BadRequestException('Este pedido em grupo já foi fechado para edições');
    }
  }

  private findMemberOrThrow(group: GroupWithRelations, customerId: string) {
    const member = group.members.find((m) => m.customerId === customerId);
    if (!member) {
      throw new ForbiddenException('Entre no pedido em grupo antes de adicionar itens');
    }
    return member;
  }

  private findOwnedItemOrThrow(group: GroupWithRelations, customerId: string, itemId: string) {
    const member = this.findMemberOrThrow(group, customerId);
    const item = group.order.items.find((i) => i.id === itemId);
    if (!item || item.groupOrderMemberId !== member.id) {
      throw new NotFoundException('Item não encontrado neste pedido em grupo');
    }
    return item;
  }

  private async recomputeOrderTotals(orderId: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    const subtotal = round2(items.reduce((sum, item) => sum + Number(item.subtotal), 0));
    await this.prisma.order.update({ where: { id: orderId }, data: { subtotal, total: subtotal } });
  }

  private async maybeAutoConfirm(groupId: string) {
    const group = await this.prisma.groupOrder.findUniqueOrThrow({
      where: { id: groupId },
      include: { order: { include: { paymentSplits: true } } },
    });
    if (!group.order) throw new Error(`GroupOrder ${group.id} está sem Order associado — dado inconsistente`);

    const allPaid = group.order.paymentSplits.every((s) => s.status === SplitStatus.PAID);
    if (!allPaid || group.status !== GroupOrderStatus.LOCKED) return;

    await this.prisma.$transaction([
      this.prisma.groupOrder.update({ where: { id: groupId }, data: { status: GroupOrderStatus.CONFIRMED } }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId: group.order.id,
          status: group.order.status,
          note: 'Todos os participantes pagaram — pedido liberado para a cozinha',
        },
      }),
    ]);
  }

  // Calcula quanto cada participante deve pagar. O valor dos itens e a
  // taxa de entrega são divididos separadamente: os itens seguem o
  // paymentMode (igual ou por consumo), a taxa segue o
  // deliveryFeeSplitMode do grupo — depois os dois são somados por
  // participante. Isso é o que faz "cada um paga o que consumiu, mas a
  // taxa é dividida igual" (ou só por quem organizou) funcionar de fato.
  private computeSplits(group: GroupWithRelations, itemsSubtotal: number, deliveryFee: number, dto: LockGroupOrderDto) {
    const members = group.members;
    const total = round2(itemsSubtotal + deliveryFee);

    if (group.paymentMode === PaymentMode.SPLIT_CUSTOM) {
      if (!dto.customAmounts || dto.customAmounts.length !== members.length) {
        throw new BadRequestException('Informe o valor de cada participante para dividir manualmente');
      }
      const sum = round2(dto.customAmounts.reduce((s, a) => s + a.amount, 0));
      if (Math.abs(sum - total) > 0.01) {
        throw new BadRequestException(`A soma dos valores (${sum}) precisa bater com o total do pedido (${total})`);
      }
      return members.map((member) => {
        const amount = dto.customAmounts!.find((a) => a.memberId === member.id)?.amount ?? 0;
        return { memberId: member.id, customerId: member.customerId, name: this.memberName(member), amount };
      });
    }

    if (group.paymentMode === PaymentMode.SINGLE) {
      return members.map((member) => ({
        memberId: member.id,
        customerId: member.customerId,
        name: this.memberName(member),
        amount: member.role === 'OWNER' ? total : 0,
      }));
    }

    if (group.paymentMode === PaymentMode.SPLIT_EQUAL) {
      const amounts = splitByWeights(total, members.map(() => 1));
      return members.map((member, i) => ({
        memberId: member.id,
        customerId: member.customerId,
        name: this.memberName(member),
        amount: amounts[i],
      }));
    }

    // SPLIT_BY_CONSUMPTION (default): cada um paga seus itens; a taxa
    // de entrega é rateada conforme deliveryFeeSplitMode.
    const memberItemSubtotals = members.map((member) =>
      round2(group.order.items.filter((i) => i.groupOrderMemberId === member.id).reduce((s, i) => s + Number(i.subtotal), 0)),
    );

    const feeShares = this.splitDeliveryFee(deliveryFee, members, memberItemSubtotals, group.deliveryFeeSplitMode);

    return members.map((member, i) => ({
      memberId: member.id,
      customerId: member.customerId,
      name: this.memberName(member),
      amount: round2(memberItemSubtotals[i] + feeShares[i]),
    }));
  }

  private splitDeliveryFee(
    deliveryFee: number,
    members: GroupWithRelations['members'],
    memberItemSubtotals: number[],
    mode: GroupWithRelations['deliveryFeeSplitMode'],
  ): number[] {
    if (deliveryFee === 0) return members.map(() => 0);

    if (mode === 'PAYER_ONLY') {
      return members.map((member) => (member.role === 'OWNER' ? deliveryFee : 0));
    }
    if (mode === 'PROPORTIONAL') {
      return splitByWeights(deliveryFee, memberItemSubtotals);
    }
    // EQUAL (padrão) e CUSTOM (sem UI dedicada ainda) caem aqui.
    return splitByWeights(deliveryFee, members.map(() => 1));
  }

  private memberName(member: GroupWithRelations['members'][number]) {
    return member.customer?.user.name ?? member.guestName ?? 'Convidado';
  }

  private buildView(group: GroupWithRelations) {
    const members = group.members.map((member) => {
      const items = group.order.items.filter((item) => item.groupOrderMemberId === member.id);
      const subtotal = round2(items.reduce((s, i) => s + Number(i.subtotal), 0));
      const split = group.order.paymentSplits.find((s) => s.groupOrderMemberId === member.id);

      return {
        id: member.id,
        customerId: member.customerId,
        name: this.memberName(member),
        role: member.role,
        items: items.map((item) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal),
          notes: item.notes,
          selectedOptions: item.selectedOptions.map((o) => ({ id: o.id, name: o.nameSnapshot, priceDelta: Number(o.priceDeltaSnapshot) })),
        })),
        subtotal,
        payment: split
          ? { id: split.id, amountDue: Number(split.amountDue), amountPaid: Number(split.amountPaid), status: split.status }
          : null,
      };
    });

    return {
      code: group.code,
      status: group.status,
      paymentMode: group.paymentMode,
      deliveryFeeSplitMode: group.deliveryFeeSplitMode,
      ownerCustomerId: group.ownerCustomerId,
      order: {
        id: group.order.id,
        type: group.order.type,
        status: group.order.status,
        subtotal: Number(group.order.subtotal),
        deliveryFee: Number(group.order.deliveryFee),
        discount: Number(group.order.discount),
        total: Number(group.order.total),
      },
      members,
    };
  }
}
