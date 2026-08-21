import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/produtos', label: 'Produtos' },
  { to: '/admin/zonas-entrega', label: 'Zonas de entrega' },
  { to: '/admin/cupons', label: 'Cupons' },
  { to: '/admin/promocoes', label: 'Promoções' },
  { to: '/admin/relatorios', label: 'Relatórios' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { company } = useCompany();

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="flex w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] font-bold text-[var(--brand-foreground)]">
              {company?.name.charAt(0).toUpperCase() ?? 'L'}
            </div>
          )}
          <span className="truncate font-semibold">{company?.name ?? 'Lanchonete'}</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-[var(--brand)] text-[var(--brand-foreground)] font-medium'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <p className="truncate px-2 text-sm text-[var(--text)]">{user?.name}</p>
          <p className="truncate px-2 text-xs text-[var(--text-muted)]">{user?.role}</p>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
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
