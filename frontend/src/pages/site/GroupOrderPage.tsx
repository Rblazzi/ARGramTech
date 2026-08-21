import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import QRCode from 'qrcode';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Address, GroupOrderView, OrderType } from '../../types';

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto — participantes podem entrar e adicionar itens',
  LOCKED: 'Fechado — aguardando pagamento de todos',
  CONFIRMED: 'Confirmado — enviado para a cozinha',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

export function GroupOrderPage() {
  const { code = '' } = useParams<{ code: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasTriedJoin = useRef(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockType, setLockType] = useState<OrderType>('PICKUP');
  const [lockAddressId, setLockAddressId] = useState('');

  const shareUrl = `${window.location.origin}/pedido-em-grupo/${code}`;

  const { data: group, isLoading } = useQuery({
    queryKey: ['group-order', code],
    queryFn: async () => (await api.get<GroupOrderView>(`/group-orders/${code}`)).data,
    refetchInterval: 4000,
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await api.get<Address[]>('/addresses')).data,
    enabled: group?.status === 'OPEN' && group?.ownerCustomerId === user?.id,
  });

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { margin: 1, width: 180 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [shareUrl]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['group-order', code] });

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/group-orders/${code}/join`).then((r) => r.data),
    onSuccess: invalidate,
  });

  const lockMutation = useMutation({
    mutationFn: () =>
      api
        .post(`/group-orders/${code}/lock`, { type: lockType, addressId: lockType === 'DELIVERY' ? lockAddressId : undefined })
        .then((r) => r.data),
    onSuccess: invalidate,
    onError: (err) => setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao fechar pedido' : 'Erro ao fechar pedido'),
  });

  const payMutation = useMutation({
    mutationFn: (splitId: string) => api.post(`/group-orders/${code}/splits/${splitId}/pay`).then((r) => r.data),
    onSuccess: invalidate,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post(`/group-orders/${code}/cancel`).then((r) => r.data),
    onSuccess: invalidate,
  });

  const isMember = Boolean(group?.members.some((m) => m.customerId === user?.id));

  useEffect(() => {
    if (!hasTriedJoin.current && group?.status === 'OPEN' && user && !isMember) {
      hasTriedJoin.current = true;
      joinMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.status, isMember, user]);

  if (isLoading || !group) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const isOwner = group.ownerCustomerId === user?.id;
  const me = group.members.find((m) => m.customerId === user?.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-sm text-[var(--text-muted)]">Pedido em grupo</p>
        <h1 className="font-mono text-3xl font-bold tracking-widest text-[var(--brand)]">{group.code}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{STATUS_LABELS[group.status]}</p>
      </div>

      {group.status === 'OPEN' && (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Convide pessoas com o link ou o QR code</p>
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={shareUrl} className="w-64 truncate rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                className="rounded-lg border border-[var(--brand)] px-3 py-2 text-sm text-[var(--brand)] hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]"
              >
                Copiar
              </button>
            </div>
          </div>
          {qrDataUrl && <img src={qrDataUrl} alt="QR code para entrar no grupo" className="rounded-lg bg-white p-2" />}
        </section>
      )}

      <section className="flex flex-col gap-3">
        {group.members.map((member) => (
          <div key={member.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {member.name} {member.role === 'OWNER' && <span className="text-xs text-[var(--brand)]">(organizador)</span>}
              </p>
              <p className="font-semibold">{formatPrice(member.subtotal)}</p>
            </div>
            {member.items.map((item) => (
              <p key={item.id} className="mt-1 text-sm text-[var(--text-muted)]">
                {item.quantity}x {item.product.name}
                {item.selectedOptions.length > 0 && ` — ${item.selectedOptions.map((o) => o.name).join(', ')}`}
              </p>
            ))}
            {member.items.length === 0 && <p className="mt-1 text-sm text-[var(--text-muted)]">Nenhum item ainda</p>}

            {member.payment && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-[var(--bg)] px-3 py-2 text-sm">
                <span>
                  Deve pagar {formatPrice(member.payment.amountDue)} —{' '}
                  <span className={member.payment.status === 'PAID' ? 'text-green-400' : 'text-[var(--brand)]'}>
                    {member.payment.status === 'PAID' ? 'Pago' : 'Aguardando pagamento'}
                  </span>
                </span>
                {member.customerId === user?.id && member.payment.status !== 'PAID' && (
                  <button
                    onClick={() => payMutation.mutate(member.payment!.id)}
                    disabled={payMutation.isPending}
                    className="rounded-lg bg-[var(--brand)] px-3 py-1 text-[var(--brand-foreground)]"
                  >
                    Marcar como pago
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {isMember && group.status === 'OPEN' && (
        <a
          href={`/cardapio?grupo=${group.code}`}
          className="rounded-lg bg-[var(--brand)] px-4 py-3 text-center font-medium text-[var(--brand-foreground)] transition hover:opacity-90"
        >
          + Adicionar itens ao pedido em grupo
        </a>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex justify-between text-sm text-[var(--text-muted)]">
          <span>Itens</span>
          <span>{formatPrice(group.order.subtotal)}</span>
        </div>
        {group.order.deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-[var(--text-muted)]">
            <span>Taxa de entrega</span>
            <span>{formatPrice(group.order.deliveryFee)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-lg font-semibold">
          <span>Total do grupo</span>
          <span>{formatPrice(group.order.total)}</span>
        </div>
      </div>

      {isOwner && group.status === 'OPEN' && (
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-medium">Fechar pedido em grupo</h2>
          <div className="flex gap-2">
            {(['PICKUP', 'DELIVERY'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLockType(t)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  lockType === t ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-muted)]'
                }`}
              >
                {t === 'DELIVERY' ? 'Entrega' : 'Retirada'}
              </button>
            ))}
          </div>
          {lockType === 'DELIVERY' && (
            <select
              value={lockAddressId}
              onChange={(e) => setLockAddressId(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            >
              <option value="">Selecione o endereço</option>
              {addresses?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.street}, {a.number}
                </option>
              ))}
            </select>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={() => lockMutation.mutate()}
            disabled={lockMutation.isPending}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] disabled:opacity-50"
          >
            Fechar e gerar cobranças
          </button>
          <button
            onClick={() => cancelMutation.mutate()}
            className="text-sm text-red-400 hover:underline"
          >
            Cancelar pedido em grupo
          </button>
        </section>
      )}

      {group.status === 'CONFIRMED' && (
        <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center text-green-400">
          Pagamento concluído — pedido enviado para a cozinha!
        </p>
      )}

      {!me && group.status !== 'OPEN' && (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Este pedido em grupo já foi fechado e você não fazia parte dele.
        </p>
      )}
    </div>
  );
}
