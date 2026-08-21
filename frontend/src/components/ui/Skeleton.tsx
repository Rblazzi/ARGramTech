// Placeholder de carregamento — evita o "flash" de conteúdo vazio e o
// pulo de layout quando os dados chegam (antes disso, toda tela só
// mostrava um texto "Carregando...").
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--surface-hover)] ${className}`} />;
}
