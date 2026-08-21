import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Category, GroupOrderView, Product } from '../../types';

function formatPrice(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CardapioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupCode = searchParams.get('grupo');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<Product[]>('/products')).data,
  });

  async function handleStartGroupOrder() {
    if (!user) {
      navigate('/login?next=/cardapio');
      return;
    }
    setIsCreatingGroup(true);
    try {
      const { data } = await api.post<GroupOrderView>('/group-orders', {});
      navigate(`/pedido-em-grupo/${data.code}`);
    } finally {
      setIsCreatingGroup(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cardápio</h1>
          <p className="text-[var(--text-muted)]">Escolha seus favoritos e monte seu pedido.</p>
        </div>
        {!groupCode && (
          <button
            onClick={handleStartGroupOrder}
            disabled={isCreatingGroup}
            className="w-fit rounded-lg border border-[var(--brand)] px-4 py-2 text-sm text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]"
          >
            👥 Pedir em grupo
          </button>
        )}
      </div>

      {groupCode && (
        <p className="w-fit rounded-full bg-[var(--brand)]/15 px-3 py-1 text-xs text-[var(--brand)]">
          Adicionando itens ao pedido em grupo {groupCode}
        </p>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {categories?.map((category) => {
        const categoryProducts = products?.filter((p) => p.categoryId === category.id) ?? [];
        if (categoryProducts.length === 0) return null;

        return (
          <section key={category.id}>
            <h2 className="mb-3 text-lg font-semibold">{category.name}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categoryProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/produto/${product.id}${groupCode ? `?grupo=${groupCode}` : ''}`}
                  className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--brand)]"
                >
                  <span className="font-medium">{product.name}</span>
                  {product.description && (
                    <span className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{product.description}</span>
                  )}
                  <span className="mt-3 font-semibold text-[var(--brand)]">{formatPrice(product.price)}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
