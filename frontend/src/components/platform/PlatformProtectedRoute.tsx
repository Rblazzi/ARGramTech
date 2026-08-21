import { Navigate, Outlet } from 'react-router-dom';
import { usePlatformAuth } from '../../contexts/PlatformAuthContext';
import { Spinner } from '../ui/Spinner';

export function PlatformProtectedRoute() {
  const { platformUser, isLoading } = usePlatformAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <Spinner accentVar="--platform-accent" />
      </div>
    );
  }

  if (!platformUser) {
    return <Navigate to="/plataforma/login" replace />;
  }

  return <Outlet />;
}
