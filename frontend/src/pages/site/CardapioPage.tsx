import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyPath } from '../../contexts/CompanyContext';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Category, GroupOrderView, Product } from '../../types';

function formatPrice(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CardapioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cp = useCompanyPath();
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
      navigate(cp(`/login?next=${encodeURIComponent(cp('/cardapio'))}`));
      return;
    }
    setIsCreatingGroup(true);
    try {
      const { data } = await api.post<GroupOrderView>('/group-orders', {});
      navigate(cp(`/pedido-em-grupo/${data.code}`));
    } finally {
      setIsCreatingGroup(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium">Cardápio</h1>
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
            <div key={i} className="overflow-hidden rounded-xl border border-[var(--border)]">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {categories?.map((category) => {
        const categoryProducts = products?.filter((p) => p.categoryId === category.id) ?? [];
        if (categoryProducts.length === 0) return null;

        return (
          <section key={category.id}>
            <h2 className="mb-3 font-display text-lg font-medium">{category.name}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categoryProducts.map((product) => (
                <Link
                  key={product.id}
                  to={cp(`/produto/${product.id}${groupCode ? `?grupo=${groupCode}` : ''}`)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-lg hover:shadow-black/20"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--surface-hover)]">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">🍽️</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="font-medium">{product.name}</span>
                    {product.description && (
                      <span className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{product.description}</span>
                    )}
                    <span className="mt-3 font-mono font-semibold text-[var(--brand)]">{formatPrice(product.price)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
