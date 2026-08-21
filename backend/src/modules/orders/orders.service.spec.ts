import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, OrderType, PaymentMethod } from '@prisma/client';
import { OrdersService } from './orders.service';

function makeSummary(overrides: Partial<any> = {}) {
  return {
    id: 'cart-1',
    items: [{ productId: 'prod-1', quantity: 2, unitPrice: 10, subtotal: 20, notes: null, selectedOptions: [] }],
    subtotal: 20,
    discount: 0,
    total: 20,
    ...overrides,
  };
}

describe('OrdersService', () => {
  let prisma: any;
  let cartService: any;
  let deliveryZonesService: any;
  let notifications: any;
  let loyaltyService: any;
  let service: OrdersService;

  beforeEach(() => {
    prisma = {
      order: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      address: { findFirst: jest.fn() },
      cart: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
      promotion: { findMany: jest.fn().mockResolvedValue([]) },
      couponUsage: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    cartService = { getSummary: jest.fn() };
    deliveryZonesService = { calculateFee: jest.fn().mockResolvedValue(0) };
    notifications = { notify: jest.fn() };
    loyaltyService = { awardPointsForOrder: jest.fn() };
    service = new OrdersService(prisma, cartService, deliveryZonesService, notifications, loyaltyService);
  });

  describe('create', () => {
    it('rejects an empty cart', async () => {
      cartService.getSummary.mockResolvedValue(makeSummary({ id: null, items: [] }));
      await expect(service.create('customer-1', 'company-1', { type: OrderType.PICKUP } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects delivery orders with an invalid address', async () => {
      cartService.getSummary.mockResolvedValue(makeSummary());
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.create('customer-1', 'company-1', { type: OrderType.DELIVERY, addressId: 'addr-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('computes the total from subtotal, discount and delivery fee, and creates the order atomically', async () => {
      cartService.getSummary.mockResolvedValue(makeSummary({ subtotal: 100, discount: 10 }));
      deliveryZonesService.calculateFee.mockResolvedValue(5);
      prisma.cart.findUniqueOrThrow.mockResolvedValue({ id: 'cart-1', couponId: null });

      const createdOrder = { id: 'order-1', customerId: 'customer-1', orderNumber: 42, total: 95 };
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([{ last_order_number: 42 }]),
        order: { create: jest.fn().mockResolvedValue(createdOrder) },
        couponUsage: { create: jest.fn() },
        cart: { update: jest.fn() },
      };
      prisma.$transaction.mockImplementation((fn: any) => fn(tx));

      const result = await service.create('customer-1', 'company-1', {
        type: OrderType.PICKUP,
        paymentMethod: PaymentMethod.PIX,
      } as any);

      expect(result).toBe(createdOrder);
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ total: 95, subtotal: 100, discount: 10, deliveryFee: 5 }) }),
      );
      expect(tx.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cart-1' }, data: expect.objectContaining({ status: 'CONVERTED' }) }),
      );
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the order does not exist for this company', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(
        service.updateStatus('staff-1', 'company-1', 'order-1', { status: OrderStatus.ACCEPTED } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an invalid status transition', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'order-1', status: OrderStatus.DELIVERED, type: OrderType.PICKUP });
      await expect(
        service.updateStatus('staff-1', 'company-1', 'order-1', { status: OrderStatus.ACCEPTED } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('applies a valid transition and notifies the customer', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'order-1', status: OrderStatus.RECEIVED, type: OrderType.PICKUP });
      const updated = { id: 'order-1', customerId: 'customer-1', orderNumber: 7, status: OrderStatus.ACCEPTED };
      prisma.order.update.mockResolvedValue(updated);

      await service.updateStatus('staff-1', 'company-1', 'order-1', { status: OrderStatus.ACCEPTED } as any);

      expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'customer-1' }));
      expect(loyaltyService.awardPointsForOrder).not.toHaveBeenCalled();
    });

    it('awards loyalty points when the order is marked as delivered', async () => {
      prisma.order.findFirst.mockResolvedValue({ id: 'order-1', status: OrderStatus.OUT_FOR_DELIVERY, type: OrderType.DELIVERY });
      const updated = { id: 'order-1', customerId: 'customer-1', orderNumber: 7, status: OrderStatus.DELIVERED };
      prisma.order.update.mockResolvedValue(updated);

      await service.updateStatus('staff-1', 'company-1', 'order-1', { status: OrderStatus.DELIVERED } as any);

      expect(loyaltyService.awardPointsForOrder).toHaveBeenCalledWith('order-1');
    });
  });

  describe('confirmPaymentReceived', () => {
    it('throws NotFoundException when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.confirmPaymentReceived('order-1')).rejects.toThrow(NotFoundException);
    });

    it('is idempotent: does nothing when the order already moved past RECEIVED', async () => {
      const order = { id: 'order-1', status: OrderStatus.ACCEPTED };
      prisma.order.findUnique.mockResolvedValue(order);

      const result = await service.confirmPaymentReceived('order-1');

      expect(result).toBe(order);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('moves RECEIVED orders to PAYMENT_CONFIRMED and notifies the customer', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', status: OrderStatus.RECEIVED });
      const updated = { id: 'order-1', customerId: 'customer-1', orderNumber: 7, status: OrderStatus.PAYMENT_CONFIRMED };
      prisma.order.update.mockResolvedValue(updated);

      await service.confirmPaymentReceived('order-1');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-1' }, data: expect.objectContaining({ status: OrderStatus.PAYMENT_CONFIRMED }) }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'customer-1' }));
    });
  });
});
