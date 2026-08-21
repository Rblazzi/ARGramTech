// Indicador de carregamento pra telas de transição sem layout nenhum
// ainda na tela (troca de sessão, resolução de empresa) — nesses casos
// não tem o que teria um Skeleton, então um spinner é a opção certa.
// accentVar troca a cor pro contexto certo: --brand (empresa) por
// padrão, ou --platform-accent nas telas do painel da plataforma (que
// não pertence a empresa nenhuma).
export function Spinner({ className = 'h-6 w-6', accentVar = '--brand' }: { className?: string; accentVar?: string }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={`animate-spin rounded-full border-2 border-[var(--border)] ${className}`}
      style={{ borderTopColor: `var(${accentVar})` }}
    />
  );
}
