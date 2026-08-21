import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Category } from '../../types';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: async () => (await api.get<Category[]>('/categories/admin')).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) => api.post('/categories', payload),
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['categories', 'admin'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/categories/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', 'admin'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', 'admin'] }),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim() });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Categorias</h1>
      <p className="mt-1 text-[var(--text-muted)]">Organize o cardápio em categorias (Lanches, Bebidas, etc).</p>

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da categoria"
          className="flex-1 max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

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
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Carregando...
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
