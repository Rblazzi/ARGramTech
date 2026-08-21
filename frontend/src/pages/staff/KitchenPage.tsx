import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { useNow } from '../../hooks/useNow';
import { ORDER_STATUS_LABELS } from '../../lib/orderStatus';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Order, OrderStatus } from '../../types';

const URGENT_AFTER_MINUTES = 15;

const NEXT_ACTION: Partial<Record<OrderStatus, (order: Order) => { label: string; status: OrderStatus }>> = {
  RECEIVED: () => ({ label: 'Aceitar', status: 'ACCEPTED' }),
  ACCEPTED: () => ({ label: 'Preparando', status: 'PREPARING' }),
  PREPARING: () => ({ label: 'Pronto', status: 'READY' }),
  READY: (order) =>
    order.type === 'DELIVERY'
      ? { label: 'Saiu para entrega', status: 'OUT_FOR_DELIVERY' }
      : { label: 'Entregue (retirado)', status: 'DELIVERED' },
  OUT_FOR_DELIVERY: () => ({ label: 'Entregue', status: 'DELIVERED' }),
};

const CANCELLABLE_STATUSES: OrderStatus[] = ['RECEIVED', 'PAYMENT_CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY'];

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function OrderCard({ order, now }: { order: Order; now: number }) {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: (status: OrderStatus) =>
      api.patch(`/orders/${order.id}/status`, { status }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders', 'kitchen'] }),
    onError: (err) => {
      alert(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao atualizar pedido' : 'Erro ao atualizar pedido');
    },
  });

  const elapsedMs = now - new Date(order.createdAt).getTime();
  const isUrgent = elapsedMs > URGENT_AFTER_MINUTES * 60 * 1000;
  const nextAction = NEXT_ACTION[order.status]?.(order);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border-2 bg-[var(--surface)] p-4 ${
        isUrgent ? 'border-red-500' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold">Pedido #{order.orderNumber}</p>
          <p className="text-sm text-[var(--text-muted)]">{order.customer?.membership.user.name}</p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-xl font-bold ${isUrgent ? 'text-red-400' : 'text-[var(--text)]'}`}>
            {formatElapsed(elapsedMs)}
          </p>
          {isUrgent && <span className="text-xs font-semibold text-red-400">ATRASADO</span>}
        </div>
      </div>

      <span className="w-fit rounded-full bg-[var(--brand)]/15 px-2 py-0.5 text-xs text-[var(--brand)]">
        {order.type === 'DELIVERY' ? 'Entrega' : 'Retirada'} · {ORDER_STATUS_LABELS[order.status]}
      </span>

      <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-2">
        {order.items.map((item) => (
          <div key={item.id} className="text-sm">
            <p className="font-medium">
              {item.quantity}x {item.product.name}
            </p>
            {item.selectedOptions.length > 0 && (
              <p className="text-[var(--text-muted)]">{item.selectedOptions.map((o) => o.nameSnapshot).join(', ')}</p>
            )}
            {item.notes && <p className="font-semibold uppercase text-[var(--brand)]">{item.notes}</p>}
          </div>
        ))}
      </div>

      {order.notes && (
        <p className="rounded-lg bg-[var(--bg)] p-2 text-sm font-semibold uppercase text-[var(--brand)]">
          {order.notes}
        </p>
      )}

      <div className="mt-auto flex gap-2 pt-2">
        {nextAction && (
          <button
            onClick={() => updateStatus.mutate(nextAction.status)}
            disabled={updateStatus.isPending}
            className="flex-1 rounded-lg bg-[var(--brand)] px-3 py-2 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
          >
            {nextAction.label}
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => {
              if (confirm(`Cancelar o pedido #${order.orderNumber}?`)) updateStatus.mutate('CANCELLED');
            }}
            disabled={updateStatus.isPending}
            className="rounded-lg border border-red-500/50 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

export function KitchenPage() {
  const now = useNow(1000);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'kitchen'],
    queryFn: async () => (await api.get<Order[]>('/orders/kitchen')).data,
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 text-[var(--text)]">
      <h1 className="mb-4 text-2xl font-semibold">Painel da Cozinha</h1>

      {!isLoading && orders?.length === 0 && (
        <p className="text-[var(--text-muted)]">Nenhum pedido em andamento no momento.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
        {orders?.map((order) => (
          <OrderCard key={order.id} order={order} now={now} />
        ))}
      </div>
    </div>
  );
}
