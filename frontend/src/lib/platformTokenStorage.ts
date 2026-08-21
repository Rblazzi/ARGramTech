// Sessão do painel da plataforma (/plataforma/*) — chaves separadas do
// tokenStorage de empresa (lib/tokenStorage.ts) de propósito: são duas
// sessões independentes, um dono de plataforma pode inclusive estar
// logado como cliente/admin de uma empresa ao mesmo tempo, em abas
// diferentes.
const ACCESS_KEY = 'lanchonete.platform.accessToken';
const REFRESH_KEY = 'lanchonete.platform.refreshToken';

export const platformTokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
