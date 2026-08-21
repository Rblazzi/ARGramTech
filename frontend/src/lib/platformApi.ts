import axios from 'axios';
import { platformTokenStorage } from './platformTokenStorage';

// Cliente axios separado do `api` de empresa (lib/api.ts): nunca manda
// X-Company-Slug (rotas /platform não dependem de tenant nenhum) e lê o
// token da sessão da plataforma, não da sessão de empresa.
export const platformApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

platformApi.interceptors.request.use((config) => {
  const token = platformTokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onSessionExpired: (() => void) | null = null;
export function setOnPlatformSessionExpired(handler: () => void) {
  onSessionExpired = handler;
}

platformApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      platformTokenStorage.clear();
      onSessionExpired?.();
    }
    return Promise.reject(error);
  },
);
