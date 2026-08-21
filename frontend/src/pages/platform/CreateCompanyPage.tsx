import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { platformApi } from '../../lib/platformApi';
import type { Company } from '../../types';

const emptyForm = {
  name: '',
  slug: '',
  primaryColor: '#FF7A00',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateCompanyPage() {
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Company | null>(null);

  const createCompany = useMutation({
    mutationFn: (payload: typeof emptyForm) => platformApi.post<Company>('/platform/companies', payload).then((r) => r.data),
    onSuccess: (company) => {
      setCreated(company);
      setForm(emptyForm);
      setSlugTouched(false);
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Não foi possível criar a empresa' : 'Erro inesperado');
    },
  });

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreated(null);
    createCompany.mutate(form);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Nova empresa</h1>
      <p className="mt-1 text-slate-400">Cadastra uma empresa nova na plataforma, já com o primeiro acesso de administrador dela.</p>

      {created && (
        <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="font-medium text-green-400">Empresa "{created.name}" criada com sucesso!</p>
          <p className="mt-2 text-sm text-slate-300">
            Link de acesso:{' '}
            <a
              href={`${window.location.origin}/${created.slug}/login`}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              {window.location.origin}/{created.slug}/login
            </a>
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Repasse esse link e o e-mail/senha de administrador que você cadastrou para o cliente.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid max-w-xl gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Nome da empresa</label>
          <input
            required
            placeholder="Pizzaria do João"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Slug (usado na URL: argramtech.com.br/slug)</label>
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Só letras minúsculas, números e hífen"
            placeholder="pizzaria-do-joao"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((f) => ({ ...f, slug: e.target.value }));
            }}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Cor principal</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-slate-950"
            />
            <input
              value={form.primaryColor}
              onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        <hr className="my-2 border-slate-800" />
        <p className="text-sm font-medium">Primeiro acesso (administrador da empresa)</p>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Nome do administrador</label>
          <input
            required
            placeholder="Nome completo"
            value={form.adminName}
            onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">E-mail do administrador</label>
          <input
            required
            type="email"
            placeholder="admin@empresa.com"
            value={form.adminEmail}
            onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Senha do administrador</label>
          <input
            required
            type="password"
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            value={form.adminPassword}
            onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={createCompany.isPending}
          className="mt-2 rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {createCompany.isPending ? 'Criando...' : 'Criar empresa'}
        </button>
      </form>
    </div>
  );
}
