import axios, { AxiosError } from 'axios';
import { tokenStorage } from './tokenStorage';
import type { AuthSession } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Callback usado pelo AuthContext para reagir a uma sessão que não pôde
// ser renovada (ex.: redirecionar para /login). Fica fora do React para
// que o interceptor do axios possa chamá-lo de qualquer lugar.
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(handler: () => void) {
  onSessionExpired = handler;
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('Sem refresh token');

  const { data } = await axios.post<AuthSession>(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
    refreshToken,
  });
  tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return api.request(originalRequest);
      } catch {
        tokenStorage.clear();
        onSessionExpired?.();
      }
    }

    return Promise.reject(error);
  },
);
