import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

function makePayment(overrides: Partial<any> = {}) {
  return {
    id: 'pay-1',
    orderId: 'order-1',
    method: PaymentMethod.PIX,
    status: PaymentStatus.PENDING,
    amount: 50,
    pixQrCode: null,
    pixCopyPaste: null,
    providerReference: null,
    expiresAt: null,
    order: { id: 'order-1', customerId: 'customer-1', orderNumber: 1001 },
    ...overrides,
  };
}

describe('PaymentsService', () => {
  let prisma: any;
  let ordersService: any;
  let config: any;
  let pixProvider: any;
  let service: PaymentsService;

  beforeEach(() => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    ordersService = { confirmPaymentReceived: jest.fn() };
    config = { get: jest.fn() };
    pixProvider = { createCharge: jest.fn() };
    service = new PaymentsService(prisma, ordersService, config, pixProvider);
  });

  describe('findOwnedOrThrow (via getForCustomer)', () => {
    it('throws NotFoundException when payment does not exist', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.getForCustomer('customer-1', 'pay-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when payment belongs to another customer', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ order: { id: 'order-1', customerId: 'other-customer', orderNumber: 1001 } }));
      await expect(service.getForCustomer('customer-1', 'pay-1')).rejects.toThrow(ForbiddenException);
    });

    it('returns the payment when owned by the customer', async () => {
      const payment = makePayment();
      prisma.payment.findUnique.mockResolvedValue(payment);
      await expect(service.getForCustomer('customer-1', 'pay-1')).resolves.toBe(payment);
    });
  });

  describe('generatePixCharge', () => {
    it('rejects payments that are not PIX', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ method: PaymentMethod.CASH }));
      await expect(service.generatePixCharge('customer-1', 'company-1', 'pay-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects payments already paid', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ status: PaymentStatus.PAID }));
      await expect(service.generatePixCharge('customer-1', 'company-1', 'pay-1')).rejects.toThrow(BadRequestException);
    });

    it('reuses an existing charge when it has not expired yet', async () => {
      const future = new Date(Date.now() + 60_000);
      const payment = makePayment({ pixCopyPaste: 'copy-paste', expiresAt: future });
      prisma.payment.findUnique.mockResolvedValue(payment);

      const result = await service.generatePixCharge('customer-1', 'company-1', 'pay-1');

      expect(result).toBe(payment);
      expect(pixProvider.createCharge).not.toHaveBeenCalled();
    });

    it('generates a new charge when there is none or it expired', async () => {
      const past = new Date(Date.now() - 60_000);
      const payment = makePayment({ pixCopyPaste: 'old', expiresAt: past });
      prisma.payment.findUnique.mockResolvedValue(payment);
      pixProvider.createCharge.mockResolvedValue({
        copyPaste: 'new-copy-paste',
        qrCodeDataUrl: 'data:image/png;base64,xyz',
        providerReference: 'ref-123',
        expiresAt: new Date(Date.now() + 120_000),
      });
      prisma.payment.update.mockResolvedValue({ ...payment, providerReference: 'ref-123' });

      await service.generatePixCharge('customer-1', 'company-1', 'pay-1');

      expect(pixProvider.createCharge).toHaveBeenCalledWith({ companyId: 'company-1', amount: 50, txid: 'PED1001' });
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pay-1' }, data: expect.objectContaining({ providerReference: 'ref-123' }) }),
      );
    });
  });

  describe('confirmPayment', () => {
    it('throws NotFoundException when no payment matches the provider reference', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.confirmPayment('ref-unknown')).rejects.toThrow(NotFoundException);
    });

    it('is idempotent: returns the payment as-is when already PAID', async () => {
      const paid = makePayment({ status: PaymentStatus.PAID });
      prisma.payment.findFirst.mockResolvedValue(paid);

      const result = await service.confirmPayment('ref-123');

      expect(result).toBe(paid);
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(ordersService.confirmPaymentReceived).not.toHaveBeenCalled();
    });

    it('marks the payment PAID and notifies the order when pending', async () => {
      const pending = makePayment({ status: PaymentStatus.PENDING, providerReference: 'ref-123' });
      prisma.payment.findFirst.mockResolvedValue(pending);
      prisma.payment.update.mockResolvedValue({ ...pending, status: PaymentStatus.PAID });

      await service.confirmPayment('ref-123');

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: pending.id }, data: expect.objectContaining({ status: PaymentStatus.PAID }) }),
      );
      expect(ordersService.confirmPaymentReceived).toHaveBeenCalledWith(pending.orderId);
    });
  });

  describe('simulateApprovalForTesting', () => {
    it('is blocked in production', async () => {
      config.get.mockReturnValue('production');
      await expect(service.simulateApprovalForTesting('customer-1', 'pay-1')).rejects.toThrow(ForbiddenException);
    });

    it('requires a PIX charge to have been generated first', async () => {
      config.get.mockReturnValue('development');
      prisma.payment.findUnique.mockResolvedValue(makePayment({ providerReference: null }));
      await expect(service.simulateApprovalForTesting('customer-1', 'pay-1')).rejects.toThrow(BadRequestException);
    });

    it('confirms the payment when a charge already exists', async () => {
      config.get.mockReturnValue('development');
      const payment = makePayment({ providerReference: 'ref-123' });
      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.payment.findFirst.mockResolvedValue(payment);
      prisma.payment.update.mockResolvedValue({ ...payment, status: PaymentStatus.PAID });

      await service.simulateApprovalForTesting('customer-1', 'pay-1');

      expect(prisma.payment.update).toHaveBeenCalled();
      expect(ordersService.confirmPaymentReceived).toHaveBeenCalledWith(payment.orderId);
    });
  });
});
