import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-[var(--bg)] text-[var(--text)]">
        <p className="text-lg font-semibold">Acesso não autorizado</p>
        <p className="text-[var(--text-muted)]">Seu perfil não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return <Outlet />;
}
