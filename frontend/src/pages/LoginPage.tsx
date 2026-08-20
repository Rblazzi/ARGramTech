import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      const next = searchParams.get('next');
      if (user.role === 'ADMIN' || user.role === 'MANAGER') {
        navigate('/admin');
      } else if (user.role === 'KITCHEN' || user.role === 'ATTENDANT') {
        navigate('/cozinha');
      } else if (user.role === 'DRIVER') {
        navigate('/entregador');
      } else {
        navigate(next || '/cardapio');
      }
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.message : null;
      setError(message ?? 'Não foi possível entrar. Verifique seus dados.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-xl font-bold text-[var(--brand-foreground)]">
            L
          </div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Lanchonete Delivery</h1>
          <p className="text-sm text-[var(--text-muted)]">Painel administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-[var(--text-muted)]">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--brand)]"
              placeholder="voce@lanchonete.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-[var(--text-muted)]">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--brand)]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          Novo por aqui?{' '}
          <Link to="/criar-conta" className="text-[var(--brand)] hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
