import { Navigate, Outlet } from 'react-router-dom';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';

export function PlatformProtectedRoute() {
  const { platformUser, isLoading } = usePlatformAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)] text-[var(--text-muted)]">
        Carregando...
      </div>
    );
  }

  if (!platformUser) {
    return <Navigate to="/plataforma/login" replace />;
  }

  return <Outlet />;
}
