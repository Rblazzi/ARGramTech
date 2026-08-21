import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { ResetPasswordButton } from '../../components/admin/ResetPasswordButton';
import type { StaffMember, StaffRole } from '../../types';

const ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  ATTENDANT: 'Atendente',
  KITCHEN: 'Cozinha',
};

const emptyForm = { name: '', email: '', password: '', role: 'ATTENDANT' as StaffRole };

export function StaffPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => (await api.get<StaffMember[]>('/staff')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  const createStaff = useMutation({
    mutationFn: (payload: typeof emptyForm) => api.post('/staff', payload),
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      invalidate();
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao criar usuário' : 'Erro ao criar usuário');
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: StaffRole }) => api.patch(`/staff/${id}`, { role }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível alterar o papel desse usuário'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/staff/${id}`, { active }),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível alterar o status desse usuário'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createStaff.mutate(form);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <p className="mt-1 text-[var(--text-muted)]">
        Quem pode acessar o painel admin, a cozinha, etc. Entregadores têm cadastro próprio na tela "Entregadores".
      </p>

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
        <select
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={createStaff.isPending}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50 sm:col-span-2"
        >
          {createStaff.isPending ? 'Criando...' : 'Adicionar usuário'}
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
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
            {!isLoading && staff?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            )}
            {staff?.map((member) => {
              const isSelf = member.id === user?.membershipId;
              return (
                <tr key={member.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    {member.user.name}
                    {isSelf && <span className="ml-2 text-xs text-[var(--text-muted)]">(você)</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{member.user.email}</td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      ROLE_LABELS[member.role]
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => updateRole.mutate({ id: member.id, role: e.target.value as StaffRole })}
                        className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        member.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'
                      }`}
                    >
                      {member.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-3">
                      {!isSelf && (
                        <button
                          onClick={() => toggleActive.mutate({ id: member.id, active: !member.active })}
                          className="text-[var(--brand)] hover:underline"
                        >
                          {member.active ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                      <ResetPasswordButton membershipId={member.id} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
