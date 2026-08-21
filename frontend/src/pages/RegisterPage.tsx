import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCompany, useCompanyPath } from '../contexts/CompanyContext';

export function RegisterPage() {
  const { register } = useAuth();
  const { company } = useCompany();
  const cp = useCompanyPath();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(form);
      navigate(searchParams.get('next') || cp('/cardapio'));
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.message : null;
      setError(message ?? 'Não foi possível criar sua conta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
        <div className="mb-8 text-center">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="mx-auto mb-3 h-12 w-12 rounded-xl object-cover" />
          ) : (
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-xl font-bold text-[var(--brand-foreground)]">
              {company?.name.charAt(0).toUpperCase() ?? 'L'}
            </div>
          )}
          <h1 className="font-display text-xl font-medium text-[var(--text)]">Criar conta</h1>
          <p className="text-sm text-[var(--text-muted)]">{company?.name ?? 'Peça seu delivery favorito'}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="register-name" className="sr-only">
            Nome completo
          </label>
          <input
            id="register-name"
            required
            autoComplete="name"
            placeholder="Nome completo"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--brand)]"
          />
          <label htmlFor="register-email" className="sr-only">
            E-mail
          </label>
          <input
            id="register-email"
            required
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--brand)]"
          />
          <label htmlFor="register-phone" className="sr-only">
            Telefone
          </label>
          <input
            id="register-phone"
            autoComplete="tel"
            placeholder="Telefone (opcional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--brand)]"
          />
          <label htmlFor="register-password" className="sr-only">
            Senha
          </label>
          <input
            id="register-password"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="Senha (mínimo 8 caracteres)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--brand)]"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          Já tem conta?{' '}
          <Link to={cp('/login')} className="text-[var(--brand)] hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
