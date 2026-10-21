import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('WalletService Integration (Section 11.2)', () => {
  let service: WalletService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => {
        const tx = {
          user: {
            findUnique: jest.fn(),
            update: jest.fn(),
          },
          transaction: {
            create: jest.fn(),
            findFirst: jest.fn(),
          },
          $queryRaw: jest.fn(),
        };
        return fn(tx);
      }),
      transaction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('deductBidFee', () => {
    it('should deduct bid fee atomically via UPDATE ... WHERE balance >= fee', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: {
            findUnique: jest.fn(),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({}),
            findFirst: jest.fn(),
          },
          $queryRaw: jest.fn().mockResolvedValue([
            { id: 'user-1', wallet_balance: 50 },
          ]),
        };
        return fn(tx);
      });

      await service.deductBidFee('user-1', 50);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      const txFn = mockPrisma.$transaction.mock.calls[0][0];
      const tx = {
        user: { findUnique: jest.fn() },
        transaction: { create: jest.fn().mockResolvedValue({}), findFirst: jest.fn() },
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-1', wallet_balance: 50 }]),
      };
      await txFn(tx);
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 'user-1',
            amount: 50,
            type: 'BID_FEE',
          }),
        }),
      );
    });

    it('should throw Insufficient Funds when atomic update matches no rows', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
          },
          transaction: {
            create: jest.fn(),
            findFirst: jest.fn(),
          },
          $queryRaw: jest.fn().mockResolvedValue([]),
        };
        return fn(tx);
      });

      await expect(service.deductBidFee('user-1', 50)).rejects.toThrow(
        'Insufficient wallet balance',
      );
    });

    it('should throw NotFound when user is missing', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          transaction: {
            create: jest.fn(),
            findFirst: jest.fn(),
          },
          $queryRaw: jest.fn().mockResolvedValue([]),
        };
        return fn(tx);
      });

      await expect(service.deductBidFee('missing', 10)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('deposit', () => {
    it('should credit balance atomically and record the deposit', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: { findUnique: jest.fn() },
          transaction: {
            create: jest.fn().mockResolvedValue({}),
            findFirst: jest.fn().mockResolvedValue(null),
          },
          $queryRaw: jest.fn().mockResolvedValue([
            { id: 'user-1', wallet_balance: 150 },
          ]),
        };
        return fn(tx);
      });

      const result = await service.deposit('user-1', 50, 'ref-1');
      expect(result.wallet_balance).toBe(150);
    });

    it('should be idempotent when reference_id already exists', async () => {
      const existingUser = { id: 'user-1', wallet_balance: 100 };
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: { findUnique: jest.fn().mockResolvedValue(existingUser) },
          transaction: {
            create: jest.fn(),
            findFirst: jest.fn().mockResolvedValue({ id: 'txn-1', reference_id: 'ref-1' }),
          },
          $queryRaw: jest.fn(),
        };
        return fn(tx);
      });

      const result = await service.deposit('user-1', 50, 'ref-1');
      expect(result).toEqual(existingUser);
    });
  });
});
