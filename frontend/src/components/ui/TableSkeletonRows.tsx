import { Skeleton } from './Skeleton';

// Linhas de esqueleto pra tabelas do admin — reaproveitado em todas as
// telas de lista (produtos, categorias, cupons, usuários...) em vez de
// cada uma reimplementar seu próprio "Carregando..." em texto.
export function TableSkeletonRows({ columns, rows = 4 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-t border-[var(--border)]">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <Skeleton className="h-4 w-full max-w-32" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
