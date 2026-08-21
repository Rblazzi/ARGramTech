// Slug da empresa atual, fora do React de propósito — o interceptor do
// axios (lib/api.ts) precisa ler isso de forma síncrona em toda
// request, o que um hook/contexto não permite fazer fora de um
// componente. Espelha o padrão já usado em tokenStorage.
let currentCompanySlug: string | null = null;

export function setCurrentCompanySlug(slug: string | null) {
  currentCompanySlug = slug;
}

export function getCurrentCompanySlug(): string | null {
  return currentCompanySlug;
}
