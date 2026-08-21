import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { platformApi, setOnPlatformSessionExpired } from '../lib/platformApi';
import { platformTokenStorage } from '../lib/platformTokenStorage';

interface PlatformUser {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
}

interface PlatformAuthContextValue {
  platformUser: PlatformUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<PlatformUser>;
  logout: () => void;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

// Sessão independente da AuthContext de empresa — o painel da plataforma
// (/plataforma/*) não pertence a nenhuma empresa, então nunca reaproveita
// useAuth()/AuthContext (que exige uma CompanyMembership pra resolver o
// usuário — ver JwtAuthGuard no backend).
export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    platformTokenStorage.clear();
    setPlatformUser(null);
  }, []);

  useEffect(() => {
    setOnPlatformSessionExpired(logout);
  }, [logout]);

  useEffect(() => {
    async function restoreSession() {
      if (!platformTokenStorage.getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await platformApi.get<PlatformUser>('/platform/me');
        setPlatformUser(data);
      } catch {
        platformTokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await platformApi.post<{ accessToken: string; refreshToken: string }>('/platform/login', {
      email,
      password,
    });
    platformTokenStorage.setTokens(data.accessToken, data.refreshToken);
    const { data: me } = await platformApi.get<PlatformUser>('/platform/me');
    setPlatformUser(me);
    return me;
  }, []);

  const value = useMemo(() => ({ platformUser, isLoading, login, logout }), [platformUser, isLoading, login, logout]);

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error('usePlatformAuth deve ser usado dentro de <PlatformAuthProvider>');
  return ctx;
}
