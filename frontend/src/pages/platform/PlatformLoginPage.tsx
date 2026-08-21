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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6">
        <span className="mb-1 inline-block rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-300">
          Plataforma
        </span>
        <h1 className="text-xl font-semibold">Painel da plataforma</h1>
        <p className="mt-1 text-sm text-slate-400">Acesso restrito ao dono do sistema.</p>

        <div className="mt-5 flex flex-col gap-3">
          <input
            required
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
          <input
            required
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-indigo-400"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
