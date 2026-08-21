import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCompanyPath } from '../../contexts/CompanyContext';
import { ORDER_STATUS_LABELS } from '../../lib/orderStatus';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Order } from '../../types';

function formatPrice(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrdersListPage() {
  const cp = useCompanyPath();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get<Order[]>('/orders')).data,
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-medium">Você ainda não fez nenhum pedido</p>
        <Link to={cp('/cardapio')} className="text-[var(--brand)] hover:underline">
          Ver cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <h1 className="font-display text-2xl font-medium">Meus pedidos</h1>
      {orders.map((order) => (
        <Link
          key={order.id}
          to={cp(`/pedido/${order.id}`)}
          className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
        >
          <div>
            <p className="font-medium">
              Pedido <span className="font-mono">#{order.orderNumber}</span>
            </p>
            <p className="text-sm text-[var(--text-muted)]">{ORDER_STATUS_LABELS[order.status]}</p>
          </div>
          <p className="font-mono font-semibold">{formatPrice(order.total)}</p>
        </Link>
      ))}
    </div>
  );
}
