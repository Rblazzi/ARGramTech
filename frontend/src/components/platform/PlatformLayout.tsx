import { NavLink, Outlet } from 'react-router-dom';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

const NAV_ITEMS = [
  { to: '/plataforma/empresas', label: 'Empresas' },
  { to: '/plataforma/site', label: 'Site institucional' },
];

// Layout visualmente distinto do AdminLayout de empresa (fundo escuro +
// selo "PLATAFORMA") de propósito — pra nunca confundir com o painel de
// uma empresa cliente enquanto navega.
export function PlatformLayout() {
  const { platformUser, logout } = usePlatformAuth();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-60 flex-col border-r border-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-300">
            Plataforma
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive ? 'bg-indigo-500 text-white font-medium' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <p className="truncate px-2 text-sm">{platformUser?.name}</p>
          <p className="truncate px-2 text-xs text-slate-400">{platformUser?.email}</p>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
