import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { platformApi } from '../../lib/platformApi';
import { ImageUploadField } from '../../components/ImageUploadField';
import { Skeleton } from '../../components/ui/Skeleton';

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
    return (
      <div className="max-w-xl space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Site institucional</h1>
      <p className="mt-1 text-[var(--text-muted)]">
        Textos e logo mostrados em argramtech.com.br. O título principal do hero não é editável aqui — tem um efeito
        visual fixo no HTML.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid max-w-xl gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <ImageUploadField
          label="Logo"
          value={form.logoUrl}
          onChange={(url) => setForm((f) => f && { ...f, logoUrl: url })}
          client={platformApi}
          endpoint="/platform/uploads/image"
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="hero-eyebrow" className="text-sm text-[var(--text-muted)]">
            Frase de destaque (acima do título)
          </label>
          <input
            id="hero-eyebrow"
            value={form.heroEyebrow}
            onChange={(e) => setForm((f) => f && { ...f, heroEyebrow: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--platform-accent)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="hero-text" className="text-sm text-[var(--text-muted)]">
            Texto do hero
          </label>
          <textarea
            id="hero-text"
            value={form.heroText}
            onChange={(e) => setForm((f) => f && { ...f, heroText: e.target.value })}
            rows={3}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--platform-accent)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="hero-cta-primary" className="text-sm text-[var(--text-muted)]">
            Botão principal
          </label>
          <input
            id="hero-cta-primary"
            value={form.heroCtaPrimaryLabel}
            onChange={(e) => setForm((f) => f && { ...f, heroCtaPrimaryLabel: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--platform-accent)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="hero-cta-secondary" className="text-sm text-[var(--text-muted)]">
            Botão secundário
          </label>
          <input
            id="hero-cta-secondary"
            value={form.heroCtaSecondaryLabel}
            onChange={(e) => setForm((f) => f && { ...f, heroCtaSecondaryLabel: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--platform-accent)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="footer-tagline" className="text-sm text-[var(--text-muted)]">
            Frase do rodapé
          </label>
          <input
            id="footer-tagline"
            value={form.footerTagline}
            onChange={(e) => setForm((f) => f && { ...f, footerTagline: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--platform-accent)]"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Salvo! Pode levar alguns segundos pra aparecer no site.</p>}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="mt-2 rounded-lg bg-[var(--platform-accent)] px-4 py-2 font-medium text-[var(--platform-accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
