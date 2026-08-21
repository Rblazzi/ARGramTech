import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { ResetPasswordButton } from '../../components/admin/ResetPasswordButton';
import type { Driver } from '../../types';

const emptyForm = { name: '', email: '', password: '', phone: '', vehicleType: '', vehiclePlate: '' };

export function DriversPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: async () => (await api.get<Driver[]>('/delivery-drivers')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['delivery-drivers'] });

  const createDriver = useMutation({
    mutationFn: (payload: typeof emptyForm) => api.post('/delivery-drivers', payload),
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      invalidate();
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao criar entregador' : 'Erro ao criar entregador');
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/delivery-drivers/${id}`, { active }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível alterar o status desse entregador'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createDriver.mutate(form);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Entregadores</h1>
      <p className="mt-1 text-[var(--text-muted)]">Pessoas que fazem as entregas, com acesso ao painel do entregador.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
        <input
          required
          placeholder="Nome completo"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
        <input
          required
          type="email"
          autoComplete="email"
          placeholder="E-mail"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
        <input
          required
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Senha (mínimo 8 caracteres)"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
        <input
          autoComplete="tel"
          placeholder="Telefone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
        <input
          placeholder="Veículo (ex.: Moto, Carro)"
          value={form.vehicleType}
          onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
        <input
          placeholder="Placa"
          value={form.vehiclePlate}
          onChange={(e) => setForm((f) => ({ ...f, vehiclePlate: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />

        {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={createDriver.isPending}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50 sm:col-span-2"
        >
          {createDriver.isPending ? 'Criando...' : 'Adicionar entregador'}
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Veículo</th>
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
            {!isLoading && drivers?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Nenhum entregador cadastrado ainda.
                </td>
              </tr>
            )}
            {drivers?.map((driver) => (
              <tr key={driver.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{driver.membership.user.name}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {driver.membership.user.email}
                  {driver.membership.user.phone && ` · ${driver.membership.user.phone}`}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">
                  {driver.vehicleType ?? '—'}
                  {driver.vehiclePlate && ` · ${driver.vehiclePlate}`}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      driver.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'
                    }`}
                  >
                    {driver.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => toggleActive.mutate({ id: driver.id, active: !driver.active })}
                      className="text-[var(--brand)] hover:underline"
                    >
                      {driver.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <ResetPasswordButton membershipId={driver.id} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
