import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../../lib/platformApi';

interface PlatformCompany {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  active: boolean;
  createdAt: string;
}

export function PlatformCompaniesPage() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ['platform', 'companies'],
    queryFn: async () => (await platformApi.get<PlatformCompany[]>('/platform/companies')).data,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Empresas</h1>
          <p className="mt-1 text-slate-400">Empresas clientes cadastradas na plataforma.</p>
        </div>
        <Link
          to="/plataforma/empresas/nova"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          + Nova empresa
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criada em</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {companies?.map((company) => (
              <tr key={company.id} className="border-t border-slate-800">
                <td className="flex items-center gap-2 px-4 py-3">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
                      style={{ backgroundColor: company.primaryColor }}
                    >
                      {company.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {company.name}
                </td>
                <td className="px-4 py-3 font-mono text-slate-400">{company.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      company.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'
                    }`}
                  >
                    {company.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{new Date(company.createdAt).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
