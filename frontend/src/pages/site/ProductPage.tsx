import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyPath } from '../../contexts/CompanyContext';
import { useCart } from '../../hooks/useCart';
import type { Product } from '../../types';

function formatPrice(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const groupCode = searchParams.get('grupo');
  const { user } = useAuth();
  const navigate = useNavigate();
  const cp = useCompanyPath();
  const { addItem } = useCart();

  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get<Product>(`/products/${id}`)).data,
    enabled: Boolean(id),
    retry: false,
  });

  function toggleOption(groupId: string, itemId: string, single: boolean, maxSelect: number) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (single) {
        return { ...prev, [groupId]: current[0] === itemId ? [] : [itemId] };
      }
      if (current.includes(itemId)) {
        return { ...prev, [groupId]: current.filter((v) => v !== itemId) };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, itemId] };
    });
  }

  async function handleAddToCart() {
    if (!product) return;
    setError(null);

    const currentPath = cp(`/produto/${product.id}${groupCode ? `?grupo=${groupCode}` : ''}`);
    if (!user) {
      navigate(cp(`/login?next=${encodeURIComponent(currentPath)}`));
      return;
    }

    const optionItemIds = Object.values(selections).flat();
    try {
      if (groupCode) {
        await api.post(`/group-orders/${groupCode}/items`, {
          productId: product.id,
          quantity,
          notes: notes || undefined,
          optionItemIds,
        });
        navigate(cp(`/pedido-em-grupo/${groupCode}`));
      } else {
        await addItem.mutateAsync({ productId: product.id, quantity, notes: notes || undefined, optionItemIds });
        navigate(cp('/carrinho'));
      }
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Não foi possível adicionar o item' : 'Erro inesperado');
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-medium">Produto não encontrado</p>
        <button onClick={() => navigate(cp('/cardapio'))} className="text-[var(--brand)] hover:underline">
          Voltar ao cardápio
        </button>
      </div>
    );
  }

  if (isLoading || !product) {
    return <p className="text-[var(--text-muted)]">Carregando...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      {product.description && <p className="mt-1 text-[var(--text-muted)]">{product.description}</p>}
      <p className="mt-2 text-xl font-semibold text-[var(--brand)]">{formatPrice(product.price)}</p>
      {groupCode && (
        <p className="mt-2 w-fit rounded-full bg-[var(--brand)]/15 px-3 py-1 text-xs text-[var(--brand)]">
          Adicionando ao pedido em grupo {groupCode}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {product.optionGroups.map((group) => (
          <div key={group.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="font-medium">{group.name}</h3>
              <span className="text-xs text-[var(--text-muted)]">
                {group.required ? 'Obrigatório' : 'Opcional'}
                {group.selectionType === 'MULTIPLE' && ` · até ${group.maxSelect}`}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {group.items.filter((item) => item.active).map((item) => {
                const single = group.selectionType === 'SINGLE';
                const checked = (selections[group.id] ?? []).includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={single ? 'radio' : 'checkbox'}
                        name={group.id}
                        checked={checked}
                        onChange={() => toggleOption(group.id, item.id, single, group.maxSelect)}
                        className="accent-[var(--brand)]"
                      />
                      {item.name}
                    </span>
                    {Number(item.priceDelta) > 0 && (
                      <span className="text-[var(--text-muted)]">+ {formatPrice(item.priceDelta)}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <h3 className="mb-2 font-medium">Observações</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: sem cebola, ponto bem passado..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--brand)]"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-10 w-10 rounded-lg border border-[var(--border)] text-lg"
          >
            −
          </button>
          <span className="w-6 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="h-10 w-10 rounded-lg border border-[var(--border)] text-lg"
          >
            +
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={handleAddToCart}
          disabled={addItem.isPending}
          className="rounded-lg bg-[var(--brand)] px-4 py-3 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {groupCode ? 'Adicionar ao pedido em grupo' : 'Adicionar ao carrinho'}
        </button>
      </div>
    </div>
  );
}
