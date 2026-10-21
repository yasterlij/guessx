import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DisputeService } from '../src/modules/disputes/dispute.service';
import { AdminService } from '../src/modules/admin/admin.service';
import { WalletController } from '../src/modules/wallet/wallet.controller';

describe('Identity Service Security Controls', () => {
  describe('DisputeService IDOR Protection', () => {
    let service: DisputeService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        dispute: {
          findUnique: jest.fn(),
        },
      };
      service = new DisputeService(mockPrisma);
    });

    it('should throw ForbiddenException when user attempts to view another user dispute', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: 'dispute-101',
        user_id: 'owner-user-id',
        description: 'Secret evidence',
      });

      await expect(
        service.getDispute('dispute-101', { id: 'attacker-user-id', role: 'user' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow dispute creator to view their own dispute', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: 'dispute-101',
        user_id: 'owner-user-id',
        description: 'Secret evidence',
      });

      const dispute = await service.getDispute('dispute-101', {
        id: 'owner-user-id',
        role: 'user',
      });
      expect(dispute.id).toBe('dispute-101');
    });

    it('should allow admin to view any dispute', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: 'dispute-101',
        user_id: 'owner-user-id',
        description: 'Secret evidence',
      });

      const dispute = await service.getDispute('dispute-101', {
        id: 'admin-user-id',
        role: 'admin',
      });
      expect(dispute.id).toBe('dispute-101');
    });
  });

  describe('AdminService Self-Role Escalation Protection', () => {
    let service: AdminService;
    let mockPrisma: any;
    let mockRedis: any;
    let mockAuditService: any;

    beforeEach(() => {
      mockPrisma = {
        user: {
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          findMany: jest.fn(),
        },
      };
      mockRedis = {
        sadd: jest.fn(),
        srem: jest.fn(),
      };
      mockAuditService = {
        log: jest.fn(),
      };
      service = new AdminService(mockPrisma, mockRedis, mockAuditService);
    });

    it('should prevent administrators from modifying their own role', async () => {
      await expect(
        service.updateRole('admin-1', 'CEO', { id: 'admin-1', phone: '0911111111' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent self-role modification in bulkUpdateRole', async () => {
      await expect(
        service.bulkUpdateRole(['user-1', 'admin-1'], 'CEO', { id: 'admin-1', phone: '0911111111' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('WalletController Direct Deposit & PII Protection', () => {
    let controller: WalletController;
    let mockWalletService: any;
    let mockWalletPinService: any;

    beforeEach(() => {
      mockWalletService = {
        resolveUser: jest.fn(),
        deposit: jest.fn(),
      };
      mockWalletPinService = {};
      controller = new WalletController(mockWalletService, mockWalletPinService);
    });

    it('should block resolveUserName when requesting another user ID without admin role', async () => {
      await expect(
        controller.resolveUserName('victim-id', {
          user: { id: 'caller-id', role: 'user' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow users to resolve their own user profile', async () => {
      mockWalletService.resolveUser.mockResolvedValue({
        id: 'caller-id',
        full_name: 'John Doe',
        phone_number: '0912345678',
      });

      const res = await controller.resolveUserName('caller-id', {
        user: { id: 'caller-id', role: 'user' },
      });
      expect(res.full_name).toBe('John Doe');
    });

    it('should block direct deposit in production for non-admin callers', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await expect(
          controller.deposit(
            { user: { id: 'caller-id', role: 'user' } },
            { amount: 500 },
          ),
        ).rejects.toThrow(ForbiddenException);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  describe('DeductFeeDto Validation Controls', () => {
    it('should reject fees over 10,000 ETB', async () => {
      const { validate } = await import('class-validator');
      const { DeductFeeDto } = await import('../src/modules/wallet/dto/deduct-fee.dto');
      const dto = new DeductFeeDto();
      dto.user_id = '123e4567-e89b-12d3-a456-426614174000';
      dto.amount = 10001;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should reject fees under 1.00 ETB', async () => {
      const { validate } = await import('class-validator');
      const { DeductFeeDto } = await import('../src/modules/wallet/dto/deduct-fee.dto');
      const dto = new DeductFeeDto();
      dto.user_id = '123e4567-e89b-12d3-a456-426614174000';
      dto.amount = 0.5;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should accept valid fees between 1.00 and 10,000 ETB', async () => {
      const { validate } = await import('class-validator');
      const { DeductFeeDto } = await import('../src/modules/wallet/dto/deduct-fee.dto');
      const dto = new DeductFeeDto();
      dto.user_id = '123e4567-e89b-12d3-a456-426614174000';
      dto.amount = 50;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('WalletService Refund Idempotency Controls', () => {
    it('should return existing user without re-applying balance if reference_id already exists', async () => {
      const { WalletService } = await import('../src/modules/wallet/wallet.service');
      const mockTx = {
        transaction: {
          findFirst: jest.fn().mockResolvedValue({ id: 'tx-1', reference_id: 'ref-123' }),
          create: jest.fn(),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue({ id: 'user-1', wallet_balance: '150.00' }),
        },
        $queryRaw: jest.fn(),
      };
      const mockPrisma: any = {
        $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
      };

      const walletService = new WalletService(mockPrisma);
      const result = await walletService.refund('user-1', 50, 'ref-123');

      expect(mockTx.transaction.findFirst).toHaveBeenCalledWith({
        where: { reference_id: 'ref-123' },
      });
      expect(mockTx.$queryRaw).not.toHaveBeenCalled();
      expect(mockTx.transaction.create).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'user-1', wallet_balance: '150.00' });
    });
  });

  describe('WalletPinService Session Controls', () => {
    it('should set 300s TTL session in Redis when PIN verification succeeds', async () => {
      const { WalletPinService } = await import('../src/modules/wallet/wallet-pin.service');
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('1234', 10);

      const mockPrisma: any = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-pin-test',
            wallet_pin_hash: hash,
            pin_attempts: 0,
            pin_locked_until: null,
          }),
          update: jest.fn().mockResolvedValue({ id: 'user-pin-test' }),
        },
      };

      const mockRedis: any = {
        set: jest.fn().mockResolvedValue('OK'),
      };

      const service = new WalletPinService({} as any, mockPrisma, mockRedis);
      const res = await service.verifyPin('user-pin-test', '1234');

      expect(res.valid).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'guessx:wallet:pin-verified:user-pin-test',
        '1',
        'EX',
        300,
      );
    });
  });

  describe('NotificationController Admin Closure Alerts (Rule 3)', () => {
    it('should dispatch admin alert with exact days open text on closure with no bidders', async () => {
      const { NotificationController } = await import(
        '../src/modules/notifications/notification.controller'
      );
      const mockNotificationService = {
        sendToRole: jest.fn().mockResolvedValue(undefined),
      };
      const controller = new NotificationController(mockNotificationService as any);

      const res = await controller.notifyAuctionNoBiddersClosed(
        'auc-closed-1',
        'iPhone 15 Pro',
        70,
        0,
      );

      expect(res).toEqual({ notified: true });
      expect(mockNotificationService.sendToRole).toHaveBeenCalledWith(
        'admin',
        'Auction Closed — No Bidders',
        'This auction has been open for the last 70 days but received no bidders.',
        {
          auction_id: 'auc-closed-1',
          type: 'no_bidders_closure',
          days_open: '70',
          product_name: 'iPhone 15 Pro',
        },
        'admin_no_bidders_alert',
        'auc-closed-1',
      );
    });
  });
});


