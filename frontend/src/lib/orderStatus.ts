import type { OrderStatus } from '../types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECEIVED: 'Pedido recebido',
  PAYMENT_CONFIRMED: 'Pagamento confirmado',
  ACCEPTED: 'Pedido aceito',
  PREPARING: 'Em preparação',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'RECEIVED',
  'PAYMENT_CONFIRMED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];
