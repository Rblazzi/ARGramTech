import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { LocationMap } from '../../components/LocationMap';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Address, Delivery } from '../../types';

function formatPrice(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Abre o app de GPS (Google Maps) já com a rota até o endereço. Usa
// coordenadas quando o endereço tem (mais preciso), ou cai pro texto do
// endereço quando não tem — endereços criados antes do mapa existir não
// têm latitude/longitude, mas o link ainda funciona buscando pelo texto.
function buildGpsUrl(address: Address): string {
  if (address.latitude && address.longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`;
  }
  const text = `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city} - ${address.state}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(text)}`;
}

const STATUS_LABELS: Record<string, string> = {
  AWAITING_DRIVER: 'Aguardando entregador',
  DRIVER_ASSIGNED: 'Aceita — retirar no local',
  PICKED_UP: 'Em rota de entrega',
  IN_ROUTE: 'Em rota de entrega',
  DELIVERED: 'Entregue',
};

function DeliveryCard({ delivery, action }: { delivery: Delivery; action: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">Pedido #{delivery.order.orderNumber}</p>
          <p className="text-sm text-[var(--text-muted)]">{delivery.order.customer.membership.user.name}</p>
        </div>
        <p className="font-semibold text-[var(--brand)]">{formatPrice(delivery.order.total)}</p>
      </div>

      {delivery.order.address && (
        <>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {delivery.order.address.street}, {delivery.order.address.number} — {delivery.order.address.neighborhood},{' '}
            {delivery.order.address.city}/{delivery.order.address.state}
          </p>

          {delivery.order.address.latitude && delivery.order.address.longitude && (
            <div className="mt-2">
              <LocationMap
                latitude={Number(delivery.order.address.latitude)}
                longitude={Number(delivery.order.address.longitude)}
                height={140}
              />
            </div>
          )}

          <a
            href={buildGpsUrl(delivery.order.address)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--brand)] hover:underline"
          >
            📍 Abrir GPS até o cliente
          </a>
        </>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
          {STATUS_LABELS[delivery.status]}
        </span>
        {action}
      </div>
    </div>
  );
}

export function DriverPage() {
  const queryClient = useQueryClient();

  const { data: available, isLoading: loadingAvailable } = useQuery({
    queryKey: ['deliveries', 'available'],
    queryFn: async () => (await api.get<Delivery[]>('/deliveries/available')).data,
    refetchInterval: 5000,
  });

  const { data: mine, isLoading: loadingMine } = useQuery({
    queryKey: ['deliveries', 'mine'],
    queryFn: async () => (await api.get<Delivery[]>('/deliveries/mine')).data,
    refetchInterval: 5000,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['deliveries'] });
  }

  function reportError(err: unknown) {
    alert(isAxiosError(err) ? err.response?.data?.message ?? 'Erro' : 'Erro inesperado');
  }

  const accept = useMutation({
    mutationFn: (id: string) => api.post(`/deliveries/${id}/accept`),
    onSuccess: invalidateAll,
    onError: reportError,
  });
  const pickedUp = useMutation({
    mutationFn: (id: string) => api.post(`/deliveries/${id}/picked-up`),
    onSuccess: invalidateAll,
    onError: reportError,
  });
  const delivered = useMutation({
    mutationFn: (id: string) => api.post(`/deliveries/${id}/delivered`),
    onSuccess: invalidateAll,
    onError: reportError,
  });

  const activeMine = mine?.filter((d) => d.status !== 'DELIVERED') ?? [];
  const history = mine?.filter((d) => d.status === 'DELIVERED') ?? [];

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 text-[var(--text)]">
      <h1 className="mb-4 text-2xl font-semibold">Painel do Entregador</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-medium">Minhas entregas em andamento</h2>
          <div className="flex flex-col gap-3">
            {loadingMine &&
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            {!loadingMine && activeMine.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Nenhuma entrega em andamento.</p>
            )}
            {activeMine.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                action={
                  delivery.status === 'DRIVER_ASSIGNED' ? (
                    <button
                      onClick={() => pickedUp.mutate(delivery.id)}
                      className="rounded-lg bg-[var(--brand)] px-3 py-1 text-sm font-medium text-[var(--brand-foreground)]"
                    >
                      Confirmar retirada
                    </button>
                  ) : (
                    <button
                      onClick={() => delivered.mutate(delivery.id)}
                      className="rounded-lg bg-[var(--brand)] px-3 py-1 text-sm font-medium text-[var(--brand-foreground)]"
                    >
                      Confirmar entrega
                    </button>
                  )
                }
              />
            ))}
          </div>

          {history.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 font-medium">Histórico</h2>
              <div className="flex flex-col gap-2">
                {history.map((delivery) => (
                  <div key={delivery.id} className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)]">
                    <span>Pedido #{delivery.order.orderNumber}</span>
                    <span>{delivery.customerRating ? `⭐ ${delivery.customerRating}` : 'Sem avaliação'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-medium">Entregas disponíveis</h2>
          <div className="flex flex-col gap-3">
            {loadingAvailable &&
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            {!loadingAvailable && available?.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Nenhuma entrega disponível no momento.</p>
            )}
            {available?.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                action={
                  <button
                    onClick={() => accept.mutate(delivery.id)}
                    disabled={accept.isPending}
                    className="rounded-lg bg-[var(--brand)] px-3 py-1 text-sm font-medium text-[var(--brand-foreground)] disabled:opacity-50"
                  >
                    Aceitar
                  </button>
                }
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
