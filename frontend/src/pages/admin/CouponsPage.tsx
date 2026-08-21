import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Coupon } from '../../types';

const TYPE_LABELS: Record<Coupon['type'], string> = {
  PERCENTAGE: 'Percentual',
  FIXED: 'Valor fixo',
  FREE_SHIPPING: 'Frete grátis',
};

const emptyForm = { code: '', type: 'PERCENTAGE' as Coupon['type'], value: '', minOrderValue: '', usageLimitPerCustomer: '1' };

export function CouponsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => (await api.get<Coupon[]>('/coupons')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['coupons'] });

  const createCoupon = useMutation({
    mutationFn: (payload: typeof emptyForm) =>
      api.post('/coupons', {
        code: payload.code,
        type: payload.type,
        value: Number(payload.value),
        minOrderValue: payload.minOrderValue ? Number(payload.minOrderValue) : undefined,
        usageLimitPerCustomer: payload.usageLimitPerCustomer ? Number(payload.usageLimitPerCustomer) : undefined,
      }),
    onSuccess: () => {
      setForm(emptyForm);
      invalidate();
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/coupons/${id}`, { active }),
    onSuccess: invalidate,
  });

  const removeCoupon = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: invalidate,
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createCoupon.mutate(form);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Cupons</h1>
      <p className="mt-1 text-[var(--text-muted)]">Descontos que os clientes aplicam no carrinho.</p>

      <form onSubmit={handleCreate} className="mt-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
        <input
          required
          placeholder="Código (ex.: PROMO10)"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Coupon['type'] }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {form.type !== 'FREE_SHIPPING' && (
          <input
            required
            type="number"
            step="0.01"
            min="0"
            placeholder={form.type === 'PERCENTAGE' ? 'Percentual (ex.: 10)' : 'Valor (R$)'}
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          />
        )}
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Pedido mínimo (opcional)"
          value={form.minOrderValue}
          onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
        <input
          type="number"
          min="1"
          placeholder="Usos por cliente"
          value={form.usageLimitPerCustomer}
          onChange={(e) => setForm((f) => ({ ...f, usageLimitPerCustomer: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />

        <button type="submit" disabled={createCoupon.isPending} className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] sm:col-span-2">
          Criar cupom
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Usos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Carregando...
                </td>
              </tr>
            )}
            {coupons?.map((coupon) => (
              <tr key={coupon.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-mono">{coupon.code}</td>
                <td className="px-4 py-3">{TYPE_LABELS[coupon.type]}</td>
                <td className="px-4 py-3">{coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : `R$ ${Number(coupon.value).toFixed(2)}`}</td>
                <td className="px-4 py-3">{coupon._count?.usages ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${coupon.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                    {coupon.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive.mutate({ id: coupon.id, active: !coupon.active })} className="mr-3 text-[var(--brand)] hover:underline">
                    {coupon.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => removeCoupon.mutate(coupon.id)} className="text-red-400 hover:underline">
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
