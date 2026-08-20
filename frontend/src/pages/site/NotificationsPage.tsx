import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AppNotification } from '../../types';

export function NotificationsPage() {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', 'me'],
    queryFn: async () => (await api.get<AppNotification[]>('/notifications/me')).data,
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold">Notificações</h1>

      {isLoading && <p className="text-[var(--text-muted)]">Carregando...</p>}
      {!isLoading && notifications?.length === 0 && (
        <p className="text-[var(--text-muted)]">Você ainda não recebeu nenhuma notificação.</p>
      )}

      {notifications?.map((n) => (
        <div key={n.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{n.title}</p>
            <p className="text-xs text-[var(--text-muted)]">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{n.message}</p>
        </div>
      ))}
    </div>
  );
}
