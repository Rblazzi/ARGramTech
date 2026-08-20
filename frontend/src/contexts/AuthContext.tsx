import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setOnSessionExpired } from '../lib/api';
import { tokenStorage } from '../lib/tokenStorage';
import type { AuthenticatedUser, AuthSession } from '../types';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthenticatedUser>;
  register: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<AuthenticatedUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setOnSessionExpired(logout);
  }, [logout]);

  useEffect(() => {
    async function restoreSession() {
      if (!tokenStorage.getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.get<AuthenticatedUser>('/auth/me');
        setUser(data);
      } catch {
        tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthSession>('/auth/login', { email, password });
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    const { data: me } = await api.get<AuthenticatedUser>('/auth/me');
    setUser(me);
    return me;
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; phone?: string }) => {
      const { data } = await api.post<AuthSession>('/auth/register', payload);
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      const { data: me } = await api.get<AuthenticatedUser>('/auth/me');
      setUser(me);
      return me;
    },
    [],
  );

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
