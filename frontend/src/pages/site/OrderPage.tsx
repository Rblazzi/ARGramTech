import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '../../lib/orderStatus';
import type { Order } from '../../types';

function formatPrice(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  CASH: 'Dinheiro',
  ONLINE: 'Pagamento online',
};

export function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasRequestedPix = useRef(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<Order>(`/orders/${id}`)).data,
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const payment = query.state.data?.payments[0];
      return payment?.method === 'PIX' && payment.status !== 'PAID' ? 4000 : false;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['order', id] });

  const generatePix = useMutation({
    mutationFn: (paymentId: string) => api.post(`/payments/${paymentId}/pix`).then((r) => r.data),
    onSuccess: invalidate,
  });

  const simulateApproval = useMutation({
    mutationFn: (paymentId: string) => api.post(`/payments/${paymentId}/simulate-approval`).then((r) => r.data),
    onSuccess: invalidate,
  });

  const payment = order?.payments[0];

  useEffect(() => {
    if (!hasRequestedPix.current && payment?.method === 'PIX' && payment.status === 'PENDING' && !payment.pixCopyPaste) {
      hasRequestedPix.current = true;
      generatePix.mutate(payment.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.id, payment?.status, payment?.pixCopyPaste]);

  if (isLoading || !order) return <p className="text-[var(--text-muted)]">Carregando pedido...</p>;

  const isCancelled = order.status === 'CANCELLED';
  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm text-[var(--text-muted)]">Pedido</p>
        <h1 className="text-2xl font-semibold">#{order.orderNumber}</h1>
      </div>

      {!isCancelled ? (
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUS_FLOW.map((status, index) => (
            <span
              key={status}
              className={`rounded-full px-3 py-1 text-xs ${
                index <= currentStepIndex
                  ? 'bg-[var(--brand)] text-[var(--brand-foreground)]'
                  : 'bg-[var(--surface)] text-[var(--text-muted)]'
              }`}
            >
              {ORDER_STATUS_LABELS[status]}
            </span>
          ))}
        </div>
      ) : (
        <span className="w-fit rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-400">
          {ORDER_STATUS_LABELS.CANCELLED}
        </span>
      )}

      {payment?.method === 'PIX' && payment.status !== 'PAID' && (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
          <h2 className="font-medium">Pague com PIX para confirmar o pedido</h2>
          {payment.pixQrCode ? (
            <>
              <img src={payment.pixQrCode} alt="QR Code do PIX" className="rounded-lg bg-white p-2" width={200} height={200} />
              <div className="flex w-full max-w-md items-center gap-2">
                <input readOnly value={payment.pixCopyPaste ?? ''} className="w-full truncate rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs" />
                <button
                  onClick={() => payment.pixCopyPaste && navigator.clipboard.writeText(payment.pixCopyPaste)}
                  className="shrink-0 rounded-lg border border-[var(--brand)] px-3 py-2 text-sm text-[var(--brand)] hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]"
                >
                  Copiar
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Escaneie com o app do seu banco ou use o copia e cola. Válido até{' '}
                {payment.expiresAt && new Date(payment.expiresAt).toLocaleTimeString('pt-BR')}.
              </p>
              {import.meta.env.DEV && (
                <button
                  onClick={() => simulateApproval.mutate(payment.id)}
                  disabled={simulateApproval.isPending}
                  className="mt-2 rounded-lg border border-dashed border-[var(--text-muted)] px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  [dev] Simular pagamento aprovado
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Gerando QR code...</p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 font-medium">Itens</h2>
        <div className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <p>
                  {item.quantity}x {item.product.name}
                </p>
                {item.selectedOptions.length > 0 && (
                  <p className="text-[var(--text-muted)]">
                    {item.selectedOptions.map((o) => o.nameSnapshot).join(', ')}
                  </p>
                )}
                {item.notes && <p className="italic text-[var(--text-muted)]">"{item.notes}"</p>}
              </div>
              <span>{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Entrega</span>
          <span>{order.type === 'DELIVERY' ? 'Entrega' : 'Retirada no local'}</span>
        </div>
        {order.address && (
          <div className="mt-1 text-[var(--text-muted)]">
            {order.address.street}, {order.address.number} — {order.address.neighborhood}, {order.address.city}/{order.address.state}
          </div>
        )}
        <div className="mt-2 flex justify-between">
          <span className="text-[var(--text-muted)]">Pagamento</span>
          <span>
            {PAYMENT_LABELS[order.payments[0]?.method] ?? order.payments[0]?.method}
            {payment?.status === 'PAID' && <span className="ml-2 text-green-400">Pago</span>}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex justify-between text-sm text-[var(--text-muted)]">
          <span>Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {Number(order.discount) > 0 && (
          <div className="flex justify-between text-sm text-green-400">
            <span>Desconto</span>
            <span>− {formatPrice(order.discount)}</span>
          </div>
        )}
        {Number(order.deliveryFee) > 0 && (
          <div className="flex justify-between text-sm text-[var(--text-muted)]">
            <span>Taxa de entrega</span>
            <span>{formatPrice(order.deliveryFee)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </section>

      <Link to="/pedidos" className="text-center text-[var(--brand)] hover:underline">
        Ver meus pedidos
      </Link>
    </div>
  );
}
