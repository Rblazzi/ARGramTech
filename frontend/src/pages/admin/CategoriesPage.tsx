import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { TableSkeletonRows } from '../../components/ui/TableSkeletonRows';
import type { Category } from '../../types';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: async () => (await api.get<Category[]>('/categories/admin')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories', 'admin'] });

  function handleError(err: unknown) {
    setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao salvar' : 'Erro ao salvar');
  }

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) => api.post('/categories', payload),
    onSuccess: () => {
      setName('');
      setError(null);
      invalidate();
    },
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string } }) => api.patch(`/categories/${id}`, payload),
    onSuccess: () => {
      setName('');
      setEditingId(null);
      setError(null);
      invalidate();
    },
    onError: handleError,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/categories/${id}`, { active }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: invalidate,
    onError: () => setError('Não foi possível remover a categoria'),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: { name: name.trim() } });
    } else {
      createMutation.mutate({ name: name.trim() });
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setName(category.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setError(null);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Categorias</h1>
      <p className="mt-1 text-[var(--text-muted)]">Organize o cardápio em categorias (Lanches, Bebidas, etc).</p>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da categoria"
          className="max-w-sm flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar'}
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
      </form>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeletonRows columns={4} />}
            {!isLoading && categories?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Nenhuma categoria cadastrada ainda.
                </td>
              </tr>
            )}
            {categories?.map((category) => (
              <tr key={category.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{category.name}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{category.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      category.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'
                    }`}
                  >
                    {category.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(category)} className="mr-3 text-[var(--brand)] hover:underline">
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: category.id, active: !category.active })}
                    className="mr-3 text-[var(--brand)] hover:underline"
                  >
                    {category.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover a categoria "${category.name}"?`)) {
                        removeMutation.mutate(category.id);
                      }
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
