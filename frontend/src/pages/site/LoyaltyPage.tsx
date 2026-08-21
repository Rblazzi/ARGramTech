import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { Skeleton } from '../../components/ui/Skeleton';
import type { LoyaltySummary } from '../../types';

const TIER_LABELS: Record<LoyaltySummary['tier'], string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  DIAMOND: 'Diamante',
};

const TIER_NEXT_THRESHOLD: Record<LoyaltySummary['tier'], number | null> = {
  BRONZE: 100,
  SILVER: 300,
  GOLD: 700,
  DIAMOND: null,
};

export function LoyaltyPage() {
  const queryClient = useQueryClient();
  const [points, setPoints] = useState('100');
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['loyalty', 'me'],
    queryFn: async () => (await api.get<LoyaltySummary>('/loyalty/me')).data,
  });

  const redeem = useMutation({
    mutationFn: (pts: number) => api.post<{ couponCode: string; discountValue: number }>('/loyalty/redeem', { points: pts }).then((r) => r.data),
    onSuccess: (result) => {
      setRedeemedCode(result.couponCode);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['loyalty', 'me'] });
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Não foi possível resgatar' : 'Erro inesperado');
    },
  });

  function handleRedeem(event: FormEvent) {
    event.preventDefault();
    setRedeemedCode(null);
    redeem.mutate(Number(points));
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <h1 className="font-display text-2xl font-medium">Fidelidade</h1>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const nextThreshold = TIER_NEXT_THRESHOLD[data.tier];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-2xl font-medium">Fidelidade</h1>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">Seu nível</p>
        <p className="mt-1 font-display text-3xl font-medium text-[var(--brand)]">{TIER_LABELS[data.tier]}</p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">Saldo disponível</p>
        <p className="font-mono text-2xl font-semibold">{data.balance} pontos</p>
        {nextThreshold && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Faltam {Math.max(0, nextThreshold - data.lifetimePoints)} pontos acumulados para o próximo nível
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-2 font-medium">Trocar pontos por desconto</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          A cada {data.pointsPerRealDiscount} pontos = R$ 1 de desconto. Mínimo de 100 pontos.
        </p>
        <form onSubmit={handleRedeem} className="flex gap-2">
          <input
            type="number"
            min={100}
            step={100}
            max={data.balance}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-32 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          />
          <button
            type="submit"
            disabled={redeem.isPending || data.balance < 100}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] disabled:opacity-50"
          >
            Resgatar
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {redeemedCode && (
          <p className="mt-2 rounded-lg bg-green-500/10 p-2 text-sm text-green-400">
            Cupom gerado: <span className="font-mono font-semibold">{redeemedCode}</span> — aplique no carrinho.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 font-medium">Histórico</h2>
        <div className="flex flex-col gap-2 text-sm">
          {data.transactions.length === 0 && <p className="text-[var(--text-muted)]">Nenhuma movimentação ainda.</p>}
          {data.transactions.map((t) => (
            <div key={t.id} className="flex justify-between">
              <span className="text-[var(--text-muted)]">{t.description}</span>
              <span className={t.points >= 0 ? 'text-green-400' : 'text-red-400'}>
                {t.points >= 0 ? '+' : ''}
                {t.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
