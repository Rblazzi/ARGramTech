import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Coupon, Promotion, PromotionType } from '../../types';

const TYPE_LABELS: Record<PromotionType, string> = {
  BIRTHDAY: 'Aniversário do cliente',
  INACTIVE_CUSTOMER: 'Cliente inativo',
  MIN_ORDER_VALUE: 'Pedido acima de um valor',
};

const emptyForm = { name: '', type: 'BIRTHDAY' as PromotionType, days: '30', minValue: '50', couponId: '' };

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => (await api.get<Promotion[]>('/promotions')).data,
  });

  const { data: coupons } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => (await api.get<Coupon[]>('/coupons')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['promotions'] });

  const createPromotion = useMutation({
    mutationFn: (payload: typeof emptyForm) => {
      const ruleConfig =
        payload.type === 'INACTIVE_CUSTOMER'
          ? { days: Number(payload.days) }
          : payload.type === 'MIN_ORDER_VALUE'
            ? { minValue: Number(payload.minValue) }
            : {};
      return api.post('/promotions', {
        name: payload.name,
        type: payload.type,
        ruleConfig,
        couponId: payload.couponId || undefined,
      });
    },
    onSuccess: () => {
      setForm(emptyForm);
      invalidate();
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/promotions/${id}`, { active }),
    onSuccess: invalidate,
  });

  const removePromotion = useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/${id}`),
    onSuccess: invalidate,
  });

  const runNow = useMutation({
    mutationFn: () => api.post('/promotions/run-now'),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createPromotion.mutate(form);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Promoções automáticas</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Aniversário e cliente inativo rodam sozinhos todo dia às 9h. Pedido mínimo dispara na hora, quando o
            cliente finaliza a compra.
          </p>
        </div>
        <button
          onClick={() => runNow.mutate()}
          disabled={runNow.isPending}
          className="rounded-lg border border-[var(--brand)] px-3 py-1.5 text-sm text-[var(--brand)] hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]"
        >
          {runNow.isPending ? 'Rodando...' : 'Rodar agora (teste)'}
        </button>
      </div>

      <form onSubmit={handleCreate} className="mt-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
        <input
          required
          placeholder="Nome da promoção"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:col-span-2"
        />
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PromotionType }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={form.couponId}
          onChange={(e) => setForm((f) => ({ ...f, couponId: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        >
          <option value="">Sem cupom (só notificação)</option>
          {coupons?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>

        {form.type === 'INACTIVE_CUSTOMER' && (
          <input
            type="number"
            min="1"
            placeholder="Dias sem pedir"
            value={form.days}
            onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          />
        )}
        {form.type === 'MIN_ORDER_VALUE' && (
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor mínimo (R$)"
            value={form.minValue}
            onChange={(e) => setForm((f) => ({ ...f, minValue: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          />
        )}

        <button type="submit" disabled={createPromotion.isPending} className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] sm:col-span-2">
          Criar promoção
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Cupom</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Carregando...
                </td>
              </tr>
            )}
            {promotions?.map((promo) => (
              <tr key={promo.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{promo.name}</td>
                <td className="px-4 py-3">{TYPE_LABELS[promo.type]}</td>
                <td className="px-4 py-3 font-mono text-xs">{promo.coupon?.code ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${promo.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                    {promo.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive.mutate({ id: promo.id, active: !promo.active })} className="mr-3 text-[var(--brand)] hover:underline">
                    {promo.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => removePromotion.mutate(promo.id)} className="text-red-400 hover:underline">
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
