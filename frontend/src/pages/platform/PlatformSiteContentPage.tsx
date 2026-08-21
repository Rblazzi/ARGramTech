import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { platformApi } from '../../lib/platformApi';
import { ImageUploadField } from '../../components/ImageUploadField';

interface SiteContent {
  id: string;
  heroEyebrow: string;
  heroText: string;
  heroCtaPrimaryLabel: string;
  heroCtaSecondaryLabel: string;
  footerTagline: string;
  logoUrl: string | null;
}

export function PlatformSiteContentPage() {
  const [form, setForm] = useState<Omit<SiteContent, 'id'> | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['platform', 'site-content'],
    queryFn: async () => (await platformApi.get<SiteContent>('/platform/site-content')).data,
  });

  useEffect(() => {
    if (data && !form) {
      const { id: _id, ...rest } = data;
      setForm(rest);
    }
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: Omit<SiteContent, 'id'>) => platformApi.patch<SiteContent>('/platform/site-content', payload),
    onSuccess: () => {
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao salvar' : 'Erro ao salvar');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (form) saveMutation.mutate(form);
  }

  if (!form) {
    return <p className="text-slate-400">Carregando...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Site institucional</h1>
      <p className="mt-1 text-slate-400">
        Textos e logo mostrados em argramtech.com.br. O título principal do hero não é editável aqui — tem um efeito
        visual fixo no HTML.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid max-w-xl gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <ImageUploadField
          label="Logo"
          value={form.logoUrl}
          onChange={(url) => setForm((f) => f && { ...f, logoUrl: url })}
          client={platformApi}
          endpoint="/platform/uploads/image"
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Frase de destaque (acima do título)</label>
          <input
            value={form.heroEyebrow}
            onChange={(e) => setForm((f) => f && { ...f, heroEyebrow: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Texto do hero</label>
          <textarea
            value={form.heroText}
            onChange={(e) => setForm((f) => f && { ...f, heroText: e.target.value })}
            rows={3}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Botão principal</label>
          <input
            value={form.heroCtaPrimaryLabel}
            onChange={(e) => setForm((f) => f && { ...f, heroCtaPrimaryLabel: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Botão secundário</label>
          <input
            value={form.heroCtaSecondaryLabel}
            onChange={(e) => setForm((f) => f && { ...f, heroCtaSecondaryLabel: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400">Frase do rodapé</label>
          <input
            value={form.footerTagline}
            onChange={(e) => setForm((f) => f && { ...f, footerTagline: e.target.value })}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Salvo! Pode levar alguns segundos pra aparecer no site.</p>}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="mt-2 rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
