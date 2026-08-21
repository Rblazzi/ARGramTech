import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { useCompany } from '../../contexts/CompanyContext';
import { ImageUploadField } from '../../components/ImageUploadField';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Company } from '../../types';

type SettingsForm = Pick<
  Company,
  'name' | 'logoUrl' | 'bannerUrl' | 'primaryColor' | 'secondaryColor' | 'phone' | 'whatsapp' | 'addressText'
>;

export function CompanySettingsPage() {
  const { company } = useCompany();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company && !form) {
      setForm({
        name: company.name,
        logoUrl: company.logoUrl,
        bannerUrl: company.bannerUrl,
        primaryColor: company.primaryColor,
        secondaryColor: company.secondaryColor,
        phone: company.phone,
        whatsapp: company.whatsapp,
        addressText: company.addressText,
      });
    }
  }, [company, form]);

  const saveMutation = useMutation({
    mutationFn: (payload: SettingsForm) => api.patch<Company>('/companies/current', payload),
    onSuccess: (res) => {
      setSaved(true);
      setError(null);
      document.documentElement.style.setProperty('--brand', res.data.primaryColor);
      if (res.data.secondaryColor) {
        document.documentElement.style.setProperty('--brand-secondary', res.data.secondaryColor);
      }
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Configurações da loja</h1>
      <p className="mt-1 text-[var(--text-muted)]">Marca, cores e contato mostrados pros seus clientes.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid max-w-xl gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--text-muted)]">Nome da empresa</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
          />
        </div>

        <ImageUploadField
          label="Logo"
          value={form.logoUrl}
          onChange={(url) => setForm((f) => f && { ...f, logoUrl: url })}
          client={api}
          endpoint="/uploads/image"
        />

        <ImageUploadField
          label="Banner"
          value={form.bannerUrl}
          onChange={(url) => setForm((f) => f && { ...f, bannerUrl: url })}
          client={api}
          endpoint="/uploads/image"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--text-muted)]">Cor primária</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm((f) => f && { ...f, primaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)]"
              />
              <input
                value={form.primaryColor}
                onChange={(e) => setForm((f) => f && { ...f, primaryColor: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--text-muted)]">Cor secundária</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.secondaryColor ?? '#000000'}
                onChange={(e) => setForm((f) => f && { ...f, secondaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg)]"
              />
              <input
                value={form.secondaryColor ?? ''}
                onChange={(e) => setForm((f) => f && { ...f, secondaryColor: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--text-muted)]">Telefone</label>
          <input
            value={form.phone ?? ''}
            onChange={(e) => setForm((f) => f && { ...f, phone: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--text-muted)]">WhatsApp</label>
          <input
            value={form.whatsapp ?? ''}
            onChange={(e) => setForm((f) => f && { ...f, whatsapp: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-[var(--text-muted)]">Endereço</label>
          <input
            value={form.addressText ?? ''}
            onChange={(e) => setForm((f) => f && { ...f, addressText: e.target.value })}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Salvo!</p>}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="mt-2 rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
