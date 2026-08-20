import { BadRequestException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';

export type ProductWithOptionGroups = Product & {
  optionGroups: Array<{
    id: string;
    name: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    items: Array<{ id: string; name: string; priceDelta: Prisma.Decimal; active: boolean }>;
  }>;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Confere se a seleção de adicionais/opções respeita os grupos do
// produto (obrigatoriedade, min/max) e calcula o preço unitário
// (preço base + soma dos adicionais escolhidos). Usado tanto pelo
// carrinho individual quanto pelo pedido em grupo — a regra de negócio
// é a mesma nos dois lugares.
export function validateProductOptionSelection(
  product: ProductWithOptionGroups,
  optionItemIds: string[],
): { unitPrice: number } {
  const allItems = new Map(
    product.optionGroups.flatMap((group) => group.items.map((item) => [item.id, { ...item, groupId: group.id }])),
  );

  for (const id of optionItemIds) {
    const item = allItems.get(id);
    if (!item || !item.active) {
      throw new BadRequestException('Uma das opções selecionadas é inválida');
    }
  }

  for (const group of product.optionGroups) {
    const selectedInGroup = optionItemIds.filter((id) => allItems.get(id)?.groupId === group.id);
    const minRequired = group.required ? Math.max(group.minSelect, 1) : group.minSelect;

    if (selectedInGroup.length < minRequired) {
      throw new BadRequestException(`Selecione pelo menos ${minRequired} opção(ões) em "${group.name}"`);
    }
    if (selectedInGroup.length > group.maxSelect) {
      throw new BadRequestException(`Selecione no máximo ${group.maxSelect} opção(ões) em "${group.name}"`);
    }
  }

  const optionsTotal = optionItemIds.reduce((sum, id) => sum + Number(allItems.get(id)!.priceDelta), 0);
  return { unitPrice: round2(Number(product.price) + optionsTotal) };
}
