import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { SalesReport } from '../../types';

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [from, setFrom] = useState(daysAgo(7));
  const [to, setTo] = useState(daysAgo(0));
  const [isExporting, setIsExporting] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'sales', from, to],
    queryFn: async () => (await api.get<SalesReport>('/reports/sales', { params: { from, to: `${to}T23:59:59` } })).data,
  });

  async function handleExport() {
    setIsExporting(true);
    try {
      const response = await api.get('/reports/sales/export', {
        params: { from, to: `${to}T23:59:59` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `vendas-${from}-a-${to}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="mt-1 text-[var(--text-muted)]">Vendas, produtos e formas de pagamento no período.</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col text-xs text-[var(--text-muted)]">
            De
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1" />
          </label>
          <label className="flex flex-col text-xs text-[var(--text-muted)]">
            Até
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1" />
          </label>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-lg border border-[var(--brand)] px-3 py-1.5 text-sm text-[var(--brand)] hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)] disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {isLoading && <p className="mt-6 text-[var(--text-muted)]">Carregando...</p>}

      {report && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            {[
              { label: 'Receita', value: formatPrice(report.totalRevenue) },
              { label: 'Pedidos', value: String(report.orderCount) },
              { label: 'Ticket médio', value: formatPrice(report.averageTicket) },
              { label: 'Cancelados', value: String(report.cancelledCount) },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
                <p className="mt-2 text-xl font-semibold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Tempo médio de preparo</p>
              <p className="mt-2 text-xl font-semibold">
                {report.avgPrepMinutes !== null ? `${report.avgPrepMinutes} min` : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Tempo médio de entrega</p>
              <p className="mt-2 text-xl font-semibold">
                {report.avgDeliveryMinutes !== null ? `${report.avgDeliveryMinutes} min` : '—'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h2 className="mb-3 font-medium">Produtos mais vendidos</h2>
              <table className="w-full text-left text-sm">
                <thead className="text-[var(--text-muted)]">
                  <tr>
                    <th className="pb-2">Produto</th>
                    <th className="pb-2">Qtd</th>
                    <th className="pb-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((p) => (
                    <tr key={p.name} className="border-t border-[var(--border)]">
                      <td className="py-2">{p.name}</td>
                      <td className="py-2">{p.quantity}</td>
                      <td className="py-2 text-right">{formatPrice(p.revenue)}</td>
                    </tr>
                  ))}
                  {report.topProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-[var(--text-muted)]">
                        Sem vendas no período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h2 className="mb-3 font-medium">Receita por forma de pagamento</h2>
              <div className="flex flex-col gap-2 text-sm">
                {Object.entries(report.revenueByPaymentMethod).map(([method, value]) => (
                  <div key={method} className="flex justify-between">
                    <span className="text-[var(--text-muted)]">{method}</span>
                    <span>{formatPrice(value)}</span>
                  </div>
                ))}
                {Object.keys(report.revenueByPaymentMethod).length === 0 && (
                  <p className="text-[var(--text-muted)]">Nenhum pagamento confirmado no período</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
