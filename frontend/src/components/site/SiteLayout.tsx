import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useCart } from '../../hooks/useCart';

export function SiteLayout() {
  const { user, logout } = useAuth();
  const { company } = useCompany();
  const { cartQuery } = useCart();
  const itemCount = cartQuery.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/cardapio" className="flex items-center gap-2 font-semibold">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] font-bold text-[var(--brand-foreground)]">
                {company?.name.charAt(0).toUpperCase() ?? 'L'}
              </span>
            )}
            {company?.name ?? 'Lanchonete Delivery'}
          </Link>

          <div className="flex items-center gap-4">
            {user?.role === 'CUSTOMER' && (
              <>
                <Link to="/pedidos" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
                  Meus pedidos
                </Link>
                <Link to="/fidelidade" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
                  Fidelidade
                </Link>
                <Link to="/notificacoes" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
                  Notificações
                </Link>
                <Link to="/carrinho" className="relative flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
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
              <button onClick={logout} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
                Sair ({user.name.split(' ')[0]})
              </button>
            ) : (
              <Link to="/login" className="text-sm text-[var(--brand)] hover:underline">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
