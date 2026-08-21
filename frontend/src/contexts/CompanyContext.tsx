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

// Aceita links no formato /loja/:slug/resto-do-caminho — usados pra
// divulgar/entrar diretamente numa empresa sem domínio próprio ainda.
// Depois de resolver a empresa, o prefixo é removido da URL (o resto do
// app continua funcionando com as mesmas rotas de sempre, sem precisar
// carregar :slug em cada uma delas).
const SLUG_PREFIX_RE = /^\/loja\/([^/]+)(\/.*)?$/;

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
      const match = window.location.pathname.match(SLUG_PREFIX_RE);
      const slug = match?.[1];

      try {
        const { data } = await api.get<Company>('/companies/resolve', {
          headers: slug
            ? { 'X-Company-Slug': slug }
            : { 'X-Site-Host': window.location.hostname },
        });

        setCurrentCompanySlug(data.slug);
        setCompany(data);

        if (match) {
          navigate(match[2] || '/cardapio', { replace: true });
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
