import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import type { DeliveryZone, DeliveryZoneType } from '../../types';

const TYPE_LABELS: Record<DeliveryZoneType, string> = {
  NEIGHBORHOOD: 'Por bairro',
  DISTANCE: 'Por distância',
  FIXED: 'Taxa fixa',
  FREE_ABOVE: 'Frete grátis acima de',
};

const emptyForm = { type: 'NEIGHBORHOOD' as DeliveryZoneType, name: '', fee: '', minOrderValueForFree: '' };

function toPayload(form: typeof emptyForm) {
  return {
    type: form.type,
    name: form.name,
    fee: form.type === 'FREE_ABOVE' ? 0 : Number(form.fee),
    minOrderValueForFree: form.type === 'FREE_ABOVE' ? Number(form.minOrderValueForFree) : undefined,
  };
}

export function DeliveryZonesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: zones, isLoading } = useQuery({
    queryKey: ['delivery-zones', 'admin'],
    queryFn: async () => (await api.get<DeliveryZone[]>('/delivery-zones/admin')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['delivery-zones', 'admin'] });

  function handleError(err: unknown) {
    setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao salvar zona' : 'Erro ao salvar zona');
  }

  const createZone = useMutation({
    mutationFn: (payload: typeof emptyForm) => api.post('/delivery-zones', toPayload(payload)),
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      invalidate();
    },
    onError: handleError,
  });

  const updateZone = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof emptyForm }) =>
      api.patch(`/delivery-zones/${id}`, toPayload(payload)),
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      setError(null);
      invalidate();
    },
    onError: handleError,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/delivery-zones/${id}`, { active }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível alterar o status da zona'),
  });

  const removeZone = useMutation({
    mutationFn: (id: string) => api.delete(`/delivery-zones/${id}`),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível remover a zona'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      updateZone.mutate({ id: editingId, payload: form });
    } else {
      createZone.mutate(form);
    }
  }

  function startEdit(zone: DeliveryZone) {
    setEditingId(zone.id);
    setForm({
      type: zone.type,
      name: zone.name,
      fee: zone.fee ?? '',
      minOrderValueForFree: zone.minOrderValueForFree ?? '',
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  const isSaving = createZone.isPending || updateZone.isPending;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Zonas de entrega</h1>
      <p className="mt-1 text-[var(--text-muted)]">
        Defina como a taxa de entrega é calculada. Prioridade: frete grátis por valor mínimo → bairro → taxa fixa →
        padrão da loja.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DeliveryZoneType }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          required
          placeholder={form.type === 'NEIGHBORHOOD' ? 'Nome do bairro' : 'Nome de exibição'}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />

        {form.type === 'FREE_ABOVE' ? (
          <input
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="Pedido mínimo (R$)"
            value={form.minOrderValueForFree}
            onChange={(e) => setForm((f) => ({ ...f, minOrderValueForFree: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:col-span-2"
          />
        ) : (
          <input
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor da taxa (R$)"
            value={form.fee}
            onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:col-span-2"
          />
        )}

        {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar zona'}
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
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Valor</th>
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
            {!isLoading && zones?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Nenhuma zona de entrega cadastrada ainda.
                </td>
              </tr>
            )}
            {zones?.map((zone) => (
              <tr key={zone.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{TYPE_LABELS[zone.type]}</td>
                <td className="px-4 py-3">{zone.name}</td>
                <td className="px-4 py-3">
                  {zone.type === 'FREE_ABOVE'
                    ? `Acima de R$ ${Number(zone.minOrderValueForFree).toFixed(2)}`
                    : `R$ ${Number(zone.fee).toFixed(2)}`}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${zone.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                    {zone.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(zone)} className="mr-3 text-[var(--brand)] hover:underline">
                    Editar
                  </button>
                  <button onClick={() => toggleActive.mutate({ id: zone.id, active: !zone.active })} className="mr-3 text-[var(--brand)] hover:underline">
                    {zone.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover a zona "${zone.name}"?`)) removeZone.mutate(zone.id);
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
