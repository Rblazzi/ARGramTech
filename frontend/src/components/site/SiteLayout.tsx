import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany, useCompanyPath } from '../../contexts/CompanyContext';
import { useCart } from '../../hooks/useCart';

const BOTTOM_NAV_ITEMS = [
  { to: '/cardapio', label: 'Cardápio', icon: '🍔' },
  { to: '/pedidos', label: 'Pedidos', icon: '📦' },
  { to: '/carrinho', label: 'Carrinho', icon: '🛒', showBadge: true },
  { to: '/fidelidade', label: 'Fidelidade', icon: '⭐' },
  { to: '/notificacoes', label: 'Avisos', icon: '🔔' },
];

export function SiteLayout() {
  const { user, logout } = useAuth();
  const { company } = useCompany();
  const cp = useCompanyPath();
  const { cartQuery } = useCart();
  const itemCount = cartQuery.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to={cp('/cardapio')} className="flex items-center gap-2 font-semibold">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] font-bold text-[var(--brand-foreground)]">
                {company?.name.charAt(0).toUpperCase() ?? 'L'}
              </span>
            )}
            <span className="truncate">{company?.name ?? 'Lanchonete Delivery'}</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Em mobile esses links vivem na navegação inferior (BOTTOM_NAV_ITEMS) —
                aqui só aparecem a partir de sm: pra não competir com o logo/nome da empresa. */}
            {isCustomer && (
              <>
                <Link to={cp('/pedidos')} className="hidden text-sm text-[var(--text-muted)] hover:text-[var(--text)] sm:inline">
                  Meus pedidos
                </Link>
                <Link to={cp('/fidelidade')} className="hidden text-sm text-[var(--text-muted)] hover:text-[var(--text)] sm:inline">
                  Fidelidade
                </Link>
                <Link to={cp('/notificacoes')} className="hidden text-sm text-[var(--text-muted)] hover:text-[var(--text)] sm:inline">
                  Notificações
                </Link>
                <Link
                  to={cp('/carrinho')}
                  className="relative hidden items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)] sm:flex"
                >
                  Carrinho
                  {itemCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-[var(--brand-foreground)]">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {user ? (
              <>
                {isCustomer && (
                  <Link to={cp('/perfil')} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
                    Perfil
                  </Link>
                )}
                <button onClick={logout} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
                  Sair ({user.name.split(' ')[0]})
                </button>
              </>
            ) : (
              <Link to={cp('/login')} className="text-sm text-[var(--brand)] hover:underline">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-5xl px-4 py-6 ${isCustomer ? 'pb-24 sm:pb-6' : ''}`}>
        <Outlet />
      </main>

      {isCustomer && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur sm:hidden">
          <div className="grid grid-cols-5">
            {BOTTOM_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={cp(item.to)}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                    isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'
                  }`
                }
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
                {item.showBadge && itemCount > 0 && (
                  <span className="absolute right-1/4 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-[var(--brand-foreground)]">
                    {itemCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
