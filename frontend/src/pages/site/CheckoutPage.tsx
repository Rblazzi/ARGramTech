import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '../../lib/api';
import { useCart } from '../../hooks/useCart';
import { useCompanyPath } from '../../contexts/CompanyContext';
import type { Address, Order, OrderType, PaymentMethod } from '../../types';

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de débito' },
  { value: 'CASH', label: 'Dinheiro' },
];

const emptyAddressForm = { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zipCode: '' };

export function CheckoutPage() {
  const navigate = useNavigate();
  const cp = useCompanyPath();
  const queryClient = useQueryClient();
  const { cartQuery } = useCart();
  const cart = cartQuery.data;

  const [type, setType] = useState<OrderType>('DELIVERY');
  const [addressId, setAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await api.get<Address[]>('/addresses')).data,
  });

  const { data: quote } = useQuery({
    queryKey: ['delivery-quote', addressId],
    queryFn: async () => (await api.post<{ fee: number }>('/delivery-zones/quote', { addressId })).data,
    enabled: type === 'DELIVERY' && Boolean(addressId),
  });
  const deliveryFee = type === 'DELIVERY' ? quote?.fee ?? null : 0;

  const createAddress = useMutation({
    mutationFn: (payload: typeof emptyAddressForm) => api.post<Address>('/addresses', payload).then((r) => r.data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm(emptyAddressForm);
    },
  });

  const createOrder = useMutation({
    mutationFn: () =>
      api
        .post<Order>('/orders', {
          type,
          addressId: type === 'DELIVERY' ? addressId : undefined,
          paymentMethod,
          notes: notes || undefined,
        })
        .then((r) => r.data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      navigate(cp(`/pedido/${order.id}`));
    },
    onError: (err) => {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Não foi possível confirmar o pedido' : 'Erro inesperado');
    },
  });

  function handleCreateAddress(event: FormEvent) {
    event.preventDefault();
    createAddress.mutate(addressForm);
  }

  function handleConfirm() {
    setError(null);
    if (type === 'DELIVERY' && !addressId) {
      setError('Selecione um endereço de entrega');
      return;
    }
    createOrder.mutate();
  }

  if (cartQuery.isLoading) return <p className="text-[var(--text-muted)]">Carregando...</p>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-lg font-medium">Seu carrinho está vazio</p>
        <Link to={cp('/cardapio')} className="text-[var(--brand)] hover:underline">
          Ver cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Finalizar pedido</h1>

      <section>
        <h2 className="mb-2 font-medium">Como você quer receber?</h2>
        <div className="flex gap-2">
          {(['DELIVERY', 'PICKUP'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg border px-4 py-2 ${
                type === t ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              {t === 'DELIVERY' ? 'Entrega' : 'Retirada no local'}
            </button>
          ))}
        </div>
      </section>

      {type === 'DELIVERY' && (
        <section>
          <h2 className="mb-2 font-medium">Endereço de entrega</h2>
          <div className="flex flex-col gap-2">
            {addresses?.map((address) => (
              <label
                key={address.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="address"
                  checked={addressId === address.id}
                  onChange={() => setAddressId(address.id)}
                  className="accent-[var(--brand)]"
                />
                {address.street}, {address.number} — {address.neighborhood}, {address.city}/{address.state}
              </label>
            ))}
          </div>

          {!showAddressForm ? (
            <button onClick={() => setShowAddressForm(true)} className="mt-2 text-sm text-[var(--brand)] hover:underline">
              + Adicionar novo endereço
            </button>
          ) : (
            <form onSubmit={handleCreateAddress} className="mt-3 grid gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-2">
              <input required placeholder="Rua" value={addressForm.street} onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 sm:col-span-2" />
              <input required placeholder="Número" value={addressForm.number} onChange={(e) => setAddressForm((f) => ({ ...f, number: e.target.value }))} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
              <input placeholder="Complemento" value={addressForm.complement} onChange={(e) => setAddressForm((f) => ({ ...f, complement: e.target.value }))} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
              <input required placeholder="Bairro" value={addressForm.neighborhood} onChange={(e) => setAddressForm((f) => ({ ...f, neighborhood: e.target.value }))} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
              <input required placeholder="Cidade" value={addressForm.city} onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
              <input required placeholder="Estado (UF)" value={addressForm.state} onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
              <input required placeholder="CEP" value={addressForm.zipCode} onChange={(e) => setAddressForm((f) => ({ ...f, zipCode: e.target.value }))} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2" />
              <button type="submit" disabled={createAddress.isPending} className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] sm:col-span-2">
                Salvar endereço
              </button>
            </form>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 font-medium">Forma de pagamento</h2>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === option.value}
                onChange={() => setPaymentMethod(option.value)}
                className="accent-[var(--brand)]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium">Observações do pedido</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
      </section>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex justify-between text-sm text-[var(--text-muted)]">
          <span>Subtotal</span>
          <span>{formatPrice(cart.subtotal)}</span>
        </div>
        {cart.discount > 0 && (
          <div className="flex justify-between text-sm text-green-400">
            <span>Desconto</span>
            <span>− {formatPrice(cart.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-[var(--text-muted)]">
          <span>Taxa de entrega</span>
          <span>{deliveryFee === null ? 'Selecione o endereço' : formatPrice(deliveryFee)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(cart.subtotal - cart.discount + (deliveryFee ?? 0))}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={createOrder.isPending}
        className="rounded-lg bg-[var(--brand)] px-4 py-3 font-medium text-[var(--brand-foreground)] transition hover:opacity-90 disabled:opacity-50"
      >
        {createOrder.isPending ? 'Confirmando...' : 'Confirmar pedido'}
      </button>
    </div>
  );
}
