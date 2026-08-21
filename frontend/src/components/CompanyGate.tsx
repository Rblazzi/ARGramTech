import type { ReactNode } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { Spinner } from './ui/Spinner';

// Bloqueia a renderização do resto do app até a empresa ser resolvida —
// evita que chamadas de API disparem antes do header X-Company-Slug
// estar definido (ex.: o AuthContext tentando restaurar sessão).
export function CompanyGate({ children }: { children: ReactNode }) {
  const { isLoading, error } = useCompany();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-[var(--bg)] text-[var(--text)]">
        <p className="text-lg font-semibold">Não foi possível identificar a loja</p>
        <p className="text-[var(--text-muted)]">Verifique o link/domínio usado para acessar.</p>
      </div>
    );
  }

  return <>{children}</>;
}
