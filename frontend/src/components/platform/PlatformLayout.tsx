import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

const NAV_ITEMS = [
  { to: '/plataforma/empresas', label: 'Empresas' },
  { to: '/plataforma/site', label: 'Site institucional' },
];

// Mesmo padrão de sidebar colapsável do AdminLayout (drawer + overlay em
// mobile) e os mesmos tokens de tema (--bg/--surface/--border/--text) —
// só a cor de destaque muda, pra --platform-accent (ver index.css), já
// que --brand é por empresa e esse painel não pertence a empresa nenhuma.
export function PlatformLayout() {
  const { platformUser, logout } = usePlatformAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const brandBlock = (
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
      <span className="rounded bg-[var(--platform-accent)]/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--platform-accent)]">
        Plataforma
      </span>
    </div>
  );

  const navBlock = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setIsMenuOpen(false)}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm transition ${
              isActive
                ? 'bg-[var(--platform-accent)] text-[var(--platform-accent-foreground)] font-medium'
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
      <p className="truncate px-2 text-sm text-[var(--text)]">{platformUser?.name}</p>
      <p className="truncate px-2 text-xs text-[var(--text-muted)]">{platformUser?.email}</p>
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
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:hidden">
        <span className="rounded bg-[var(--platform-accent)]/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--platform-accent)]">
          Plataforma
        </span>
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
