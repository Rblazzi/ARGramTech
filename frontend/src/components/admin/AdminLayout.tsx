import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany, useCompanyPath } from '../../contexts/CompanyContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/produtos', label: 'Produtos' },
  { to: '/admin/zonas-entrega', label: 'Zonas de entrega' },
  { to: '/admin/cupons', label: 'Cupons' },
  { to: '/admin/promocoes', label: 'Promoções' },
  { to: '/admin/relatorios', label: 'Relatórios' },
  { to: '/admin/entregadores', label: 'Entregadores' },
  { to: '/admin/configuracoes', label: 'Configurações' },
];

// Só ADMIN gerencia outros usuários (ver StaffController no backend —
// restrito a ADMIN, diferente do resto que também libera MANAGER).
const ADMIN_ONLY_NAV_ITEMS = [{ to: '/admin/usuarios', label: 'Usuários' }];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { company } = useCompany();
  const cp = useCompanyPath();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const brandBlock = (
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
  );

  const visibleNavItems = user?.role === 'ADMIN' ? [...NAV_ITEMS, ...ADMIN_ONLY_NAV_ITEMS] : NAV_ITEMS;

  const navBlock = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {visibleNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={cp(item.to)}
          end={item.end}
          onClick={() => setIsMenuOpen(false)}
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
  );

  const userBlock = (
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
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Barra superior só em mobile: abre/fecha o menu em vez da sidebar fixa */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:hidden">
        <span className="truncate font-semibold">{company?.name ?? 'Lanchonete'}</span>
        <button
          onClick={() => setIsMenuOpen(true)}
          aria-label="Abrir menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-xl"
        >
          ☰
        </button>
      </div>

      {isMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 md:relative md:w-60 md:translate-x-0 ${
          isMenuOpen ? 'translate-x-0' : ''
        }`}
      >
        {brandBlock}
        {navBlock}
        {userBlock}
      </aside>

      <main className="flex-1 overflow-y-auto p-4 pt-20 md:p-6 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
