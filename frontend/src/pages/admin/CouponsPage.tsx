import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import type { Coupon } from '../../types';

const TYPE_LABELS: Record<Coupon['type'], string> = {
  PERCENTAGE: 'Percentual',
  FIXED: 'Valor fixo',
  FREE_SHIPPING: 'Frete grátis',
};

const emptyForm = { code: '', type: 'PERCENTAGE' as Coupon['type'], value: '', minOrderValue: '', usageLimitPerCustomer: '1' };

function toPayload(form: typeof emptyForm) {
  return {
    code: form.code,
    type: form.type,
    value: Number(form.value),
    minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
    usageLimitPerCustomer: form.usageLimitPerCustomer ? Number(form.usageLimitPerCustomer) : undefined,
  };
}

export function CouponsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => (await api.get<Coupon[]>('/coupons')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['coupons'] });

  function handleError(err: unknown) {
    setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao salvar cupom' : 'Erro ao salvar cupom');
  }

  const createCoupon = useMutation({
    mutationFn: (payload: typeof emptyForm) => api.post('/coupons', toPayload(payload)),
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      invalidate();
    },
    onError: handleError,
  });

  const updateCoupon = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof emptyForm }) => api.patch(`/coupons/${id}`, toPayload(payload)),
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      setError(null);
      invalidate();
    },
    onError: handleError,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/coupons/${id}`, { active }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível alterar o status do cupom'),
  });

  const removeCoupon = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível remover o cupom'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      updateCoupon.mutate({ id: editingId, payload: form });
    } else {
      createCoupon.mutate(form);
    }
  }

  function startEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value ?? '',
      minOrderValue: coupon.minOrderValue ?? '',
      usageLimitPerCustomer: coupon.usageLimitPerCustomer != null ? String(coupon.usageLimitPerCustomer) : '',
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  const isSaving = createCoupon.isPending || updateCoupon.isPending;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Cupons</h1>
      <p className="mt-1 text-[var(--text-muted)]">Descontos que os clientes aplicam no carrinho.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
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

        {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar cupom'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]"
            >
              Cancelar
            </button>
          )}
        </div>
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
            {!isLoading && coupons?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Nenhum cupom cadastrado ainda.
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
                  <button onClick={() => startEdit(coupon)} className="mr-3 text-[var(--brand)] hover:underline">
                    Editar
                  </button>
                  <button onClick={() => toggleActive.mutate({ id: coupon.id, active: !coupon.active })} className="mr-3 text-[var(--brand)] hover:underline">
                    {coupon.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover o cupom "${coupon.code}"?`)) removeCoupon.mutate(coupon.id);
                    }}
                    className="text-red-400 hover:underline"
                  >
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
