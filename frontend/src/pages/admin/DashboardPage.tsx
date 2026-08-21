import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { Skeleton } from '../../components/ui/Skeleton';
import type { SalesReport } from '../../types';

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Recebido',
  PAYMENT_CONFIRMED: 'Pagamento confirmado',
  ACCEPTED: 'Aceito',
  PREPARING: 'Preparando',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export function DashboardPage() {
  const { user } = useAuth();

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'sales', 'today'],
    queryFn: async () => (await api.get<SalesReport>('/reports/sales')).data,
  });

  const inProgress = report
    ? Object.entries(report.ordersByStatus)
        .filter(([status]) => !['DELIVERED', 'CANCELLED'].includes(status))
        .reduce((sum, [, count]) => sum + count, 0)
    : 0;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {user?.name}</h1>
          <p className="mt-1 text-[var(--text-muted)]">Resumo de hoje. Para outros períodos, veja os relatórios completos.</p>
        </div>
        <Link to="/admin/relatorios" className="text-sm text-[var(--brand)] hover:underline">
          Ver relatórios →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Vendas hoje', value: formatPrice(report?.totalRevenue ?? 0) },
          { label: 'Pedidos em andamento', value: String(inProgress) },
          { label: 'Ticket médio', value: formatPrice(report?.averageTicket ?? 0) },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
            {isLoading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-2 text-2xl font-semibold">{card.value}</p>}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {report && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="mb-3 font-medium">Pedidos por status</h2>
            <div className="flex flex-col gap-2 text-sm">
              {Object.entries(report.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{STATUS_LABELS[status] ?? status}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="mb-3 font-medium">Produtos mais vendidos</h2>
            <div className="flex flex-col gap-2 text-sm">
              {report.topProducts.length === 0 && <p className="text-[var(--text-muted)]">Sem vendas ainda hoje.</p>}
              {report.topProducts.map((p) => (
                <div key={p.name} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-[var(--text-muted)]">{p.quantity}x</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
