import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { CartSummary } from '../types';

const CART_KEY = ['cart'];

export function useCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: CART_KEY,
    queryFn: async () => (await api.get<CartSummary>('/cart')).data,
    enabled: user?.role === 'CUSTOMER',
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: CART_KEY });
  }

  const addItem = useMutation({
    mutationFn: (payload: { productId: string; quantity: number; notes?: string; optionItemIds?: string[] }) =>
      api.post<CartSummary>('/cart/items', payload).then((res) => res.data),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });

  const updateItem = useMutation({
    mutationFn: ({ itemId, ...payload }: { itemId: string; quantity?: number; notes?: string }) =>
      api.patch<CartSummary>(`/cart/items/${itemId}`, payload).then((res) => res.data),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete<CartSummary>(`/cart/items/${itemId}`).then((res) => res.data),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });

  const applyCoupon = useMutation({
    mutationFn: (code: string) => api.post<CartSummary>('/cart/coupon', { code }).then((res) => res.data),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });

  const removeCoupon = useMutation({
    mutationFn: () => api.delete<CartSummary>('/cart/coupon').then((res) => res.data),
    onSuccess: (data) => queryClient.setQueryData(CART_KEY, data),
  });

  return { cartQuery, addItem, updateItem, removeItem, applyCoupon, removeCoupon, invalidate };
}
