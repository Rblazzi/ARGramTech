import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { setCurrentCompanySlug } from '../lib/companyState';
import type { Company } from '../types';

interface CompanyContextValue {
  company: Company | null;
  isLoading: boolean;
  error: boolean;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

// O slug da empresa é permanente na URL (/:slug/cardapio, /:slug/admin...) —
// isso é o que faz um link, favorito ou F5 continuar funcionando mesmo
// depois que existir mais de uma empresa na plataforma (ver App.tsx, que
// aninha todas as rotas sob "/:companySlug"). Aqui só extraímos o
// primeiro segmento da URL sem remover — quem decide para onde navegar é
// o App.tsx via rotas normais.
function firstPathSegment(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)/);
  return match ? match[1] : null;
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const resolvedOnce = useRef(false);

  useEffect(() => {
    if (resolvedOnce.current) return;
    resolvedOnce.current = true;

    async function resolve() {
      const slug = firstPathSegment(window.location.pathname);

      try {
        const { data } = await api.get<Company>('/companies/resolve', {
          headers: slug
            ? { 'X-Company-Slug': slug }
            : { 'X-Site-Host': window.location.hostname },
        });

        setCurrentCompanySlug(data.slug);
        setCompany(data);

        // Sem slug na URL (ex.: raiz do domínio próprio de uma empresa,
        // ou a URL crua do deploy de preview) — entra na rotas normais
        // já com o slug resolvido.
        if (!slug) {
          navigate(`/${data.slug}/cardapio`, { replace: true });
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    resolve();
  }, [navigate]);

  useEffect(() => {
    if (!company) return;
    document.documentElement.style.setProperty('--brand', company.primaryColor);
    if (company.secondaryColor) {
      document.documentElement.style.setProperty('--brand-secondary', company.secondaryColor);
    }
    document.title = company.name;
  }, [company]);

  return <CompanyContext.Provider value={{ company, isLoading, error }}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany deve ser usado dentro de <CompanyProvider>');
  return ctx;
}

// Uso: const cp = useCompanyPath(); <Link to={cp('/cardapio')}>
// Prefixa qualquer caminho absoluto com o slug da empresa atual — é
// assim que todo link interno do app continua dentro do namespace da
// empresa certa (/:slug/...). Só usar depois que <CompanyGate> já
// garantiu que a empresa foi resolvida (company nunca é null aqui).
export function useCompanyPath() {
  const { company } = useCompany();
  return (path: string) => `/${company!.slug}${path}`;
}
