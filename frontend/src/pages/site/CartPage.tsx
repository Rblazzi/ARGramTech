import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useCart } from '../../hooks/useCart';
import { useCompanyPath } from '../../contexts/CompanyContext';

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CartPage() {
  const cp = useCompanyPath();
  const { cartQuery, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const cart = cartQuery.data;

  async function handleApplyCoupon(event: FormEvent) {
    event.preventDefault();
    setCouponError(null);
    try {
      await applyCoupon.mutateAsync(couponCode);
      setCouponCode('');
    } catch (err) {
      setCouponError(isAxiosError(err) ? err.response?.data?.message ?? 'Cupom inválido' : 'Cupom inválido');
    }
  }

  if (cartQuery.isLoading) {
    return <p className="text-[var(--text-muted)]">Carregando carrinho...</p>;
  }

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
      <h1 className="text-2xl font-semibold">Seu carrinho</h1>

      <div className="flex flex-col gap-3">
        {cart.items.map((item) => (
          <div key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{item.product.name}</p>
                {item.selectedOptions.length > 0 && (
                  <p className="text-sm text-[var(--text-muted)]">
                    {item.selectedOptions.map((o) => o.name).join(', ')}
                  </p>
                )}
                {item.notes && <p className="text-sm italic text-[var(--text-muted)]">"{item.notes}"</p>}
              </div>
              <p className="font-semibold">{formatPrice(item.subtotal)}</p>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateItem.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                  className="h-10 w-10 rounded-lg border border-[var(--border)] text-lg"
                >
                  −
                </button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                  className="h-10 w-10 rounded-lg border border-[var(--border)] text-lg"
                >
                  +
                </button>
              </div>
              <button onClick={() => removeItem.mutate(item.id)} className="text-sm text-red-400 hover:underline">
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        {cart.coupon ? (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Cupom <span className="font-semibold text-[var(--brand)]">{cart.coupon.code}</span> aplicado
            </p>
            <button onClick={() => removeCoupon.mutate()} className="text-sm text-red-400 hover:underline">
              Remover
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Cupom de desconto"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none focus:border-[var(--brand)]"
            />
            <button
              type="submit"
              disabled={applyCoupon.isPending || !couponCode}
              className="rounded-lg border border-[var(--brand)] px-4 py-2 text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)] disabled:opacity-50"
            >
              Aplicar
            </button>
          </form>
        )}
        {couponError && <p className="mt-2 text-sm text-red-400">{couponError}</p>}
      </div>

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
          <span>{cart.deliveryFee > 0 ? formatPrice(cart.deliveryFee) : 'A calcular'}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-2 text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(cart.total)}</span>
        </div>
      </div>

      <Link
        to={cp('/checkout')}
        className="block rounded-lg bg-[var(--brand)] px-4 py-3 text-center font-medium text-[var(--brand-foreground)] transition hover:opacity-90"
      >
        Finalizar pedido
      </Link>
    </div>
  );
}
