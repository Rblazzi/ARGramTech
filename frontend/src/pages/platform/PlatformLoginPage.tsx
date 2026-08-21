import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

export function PlatformLoginPage() {
  const { login } = usePlatformAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/plataforma/empresas', { replace: true });
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Erro ao entrar' : 'Erro ao entrar');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 text-[var(--text)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <span className="mb-1 inline-block rounded bg-[var(--platform-accent)]/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--platform-accent)]">
          Plataforma
        </span>
        <h1 className="text-xl font-semibold">Painel da plataforma</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Acesso restrito ao dono do sistema.</p>

        <div className="mt-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="platform-email" className="text-sm text-[var(--text-muted)]">
              E-mail
            </label>
            <input
              id="platform-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--platform-accent)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="platform-password" className="text-sm text-[var(--text-muted)]">
              Senha
            </label>
            <input
              id="platform-password"
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--platform-accent)]"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded-lg bg-[var(--platform-accent)] px-4 py-2 font-medium text-[var(--platform-accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
