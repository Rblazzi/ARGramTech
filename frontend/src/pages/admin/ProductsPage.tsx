import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { ImageUploadField } from '../../components/ImageUploadField';
import { TableSkeletonRows } from '../../components/ui/TableSkeletonRows';
import type { Category, Product } from '../../types';

const emptyForm = { categoryId: '', name: '', price: '', internalCode: '', description: '', imageUrl: '' };

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: async () => (await api.get<Product[]>('/products/admin')).data,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: async () => (await api.get<Category[]>('/categories/admin')).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof emptyForm) =>
      api.post('/products', { ...payload, price: Number(payload.price) }),
    onSuccess: () => {
      setForm(emptyForm);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['products', 'admin'] });
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao criar produto' : 'Erro ao criar produto');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof emptyForm }) =>
      api.patch(`/products/${id}`, { ...payload, price: Number(payload.price) }),
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['products', 'admin'] });
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao salvar produto' : 'Erro ao salvar produto');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/products/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', 'admin'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', 'admin'] }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      categoryId: product.categoryId,
      name: product.name,
      price: product.price,
      internalCode: product.internalCode,
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Produtos</h1>
      <p className="mt-1 text-[var(--text-muted)]">
        Cadastre os itens do cardápio. Adicionais e opções (ex.: ponto da carne) são gerenciados na
        página de detalhe do produto, na próxima etapa.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
        <select
          required
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        >
          <option value="">Selecione a categoria</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          required
          placeholder="Nome do produto"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />

        <input
          required
          type="number"
          step="0.01"
          min="0"
          placeholder="Preço (R$)"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />

        <input
          required
          placeholder="Código interno (ex.: XB001)"
          value={form.internalCode}
          onChange={(e) => setForm((f) => ({ ...f, internalCode: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />

        <input
          placeholder="Descrição"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)] sm:col-span-2"
        />

        <div className="sm:col-span-2">
          <ImageUploadField
            label="Foto do produto"
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            client={api}
            endpoint="/uploads/image"
          />
        </div>

        {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar produto'}
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
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeletonRows columns={5} />}
            {!isLoading && products?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
            {products?.map((product) => (
              <tr key={product.id} className="border-t border-[var(--border)]">
                <td className="flex items-center gap-2 px-4 py-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-[var(--bg)] text-xs text-[var(--text-muted)]">
                      —
                    </span>
                  )}
                  {product.name}
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{product.category.name}</td>
                <td className="px-4 py-3">
                  {Number(product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      product.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'
                    }`}
                  >
                    {product.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(product)} className="mr-3 text-[var(--brand)] hover:underline">
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: product.id, active: !product.active })}
                    className="mr-3 text-[var(--brand)] hover:underline"
                  >
                    {product.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover o produto "${product.name}"?`)) {
                        removeMutation.mutate(product.id);
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
