import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuctionsService } from '../src/modules/auctions/auctions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { BidEncryptionService } from '../src/modules/common/bid-encryption.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { RedisCacheService } from '../src/modules/common/redis-cache.service';

describe('AuctionsService', () => {
  let service: AuctionsService;
  let mockPrisma: any;
  let mockRedisCache: any;
  let mockBidEncryption: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      auction: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      bid: {
        count: jest.fn().mockResolvedValue(20),
      },
      favorite: {
        findFirst: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };

    mockRedisCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    mockBidEncryption = {
      encrypt: jest.fn((val) => `enc_${val}`),
      decrypt: jest.fn((val) => parseFloat(val.replace('enc_', ''))),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
      logBatch: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisCacheService, useValue: mockRedisCache },
        { provide: BidEncryptionService, useValue: mockBidEncryption },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuctionsService>(AuctionsService);
  });

  describe('getActiveAuctions', () => {
    it('should return cached auctions when cache hit', async () => {
      const cachedAuctions = [{ id: 'auc-cached', status: 'ACTIVE' }];
      mockRedisCache.get.mockResolvedValue(cachedAuctions);

      const result = await service.getActiveAuctions();

      expect(result).toBe(cachedAuctions);
      expect(mockRedisCache.get).toHaveBeenCalledWith('auctions:active:p1:l50');
      expect(mockPrisma.auction.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database, cache in Redis, and return formatted auctions on cache miss', async () => {
      mockRedisCache.get.mockResolvedValue(null);

      const now = new Date();
      const future = new Date(now.getTime() + 3600000);
      const dbAuctions = [
        {
          id: 'auc-1',
          public_code: 101,
          product_id: 'prod-1',
          start_time: now,
          end_time: future,
          status: 'ACTIVE',
          bid_fee: 2.5,
          product: {
            id: 'prod-1',
            name: 'Test Phone',
            description: 'Test description',
            image_urls: ['http://example.com/img.jpg'],
            current_market_price: 1000,
            category: 'Smartphones',
            brand: 'TestBrand',
            specs: {},
          },
        },
      ];

      mockPrisma.auction.findMany.mockResolvedValue(dbAuctions);
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ auction_id: 'auc-1', count: '10' }]) // bid counts
        .mockResolvedValueOnce([{ auction_id: 'auc-1', count: '5' }]); // unique bidders

      const result = await service.getActiveAuctions();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('auc-1');
      expect(result[0].stats.total_bids).toBe(10);
      expect(result[0].stats.unique_bidders).toBe(5);
      expect(mockRedisCache.set).toHaveBeenCalledWith('auctions:active:p1:l50', expect.any(Array), 5);
    });

    it('should return empty array when no active auctions exist', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockPrisma.auction.findMany.mockResolvedValue([]);

      const result = await service.getActiveAuctions();

      expect(result).toEqual([]);
    });
  });

  describe('getActiveAuction', () => {
    it('should throw NotFoundException when auction not found', async () => {
      mockPrisma.auction.findFirst.mockResolvedValue(null);

      await expect(service.getActiveAuction('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return auction detail with stats when found', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 3600000);
      const auction = {
        id: 'auc-detail',
        public_code: 102,
        product_id: 'prod-2',
        start_time: now,
        end_time: future,
        status: 'ACTIVE',
        bid_fee: 1.0,
        product: {
          id: 'prod-2',
          name: 'Laptop',
          description: 'A laptop',
          image_urls: [],
          current_market_price: 2000,
          category: 'Computers',
          brand: 'Brand',
          specs: {},
        },
      };

      mockPrisma.auction.findFirst.mockResolvedValue(auction);
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: '8' }]);

      const result = await service.getActiveAuction('auc-detail', 'user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('auc-detail');
      expect(result.stats.total_bids).toBe(20);
      expect(result.stats.unique_bidders).toBe(8);
    });
  });
});
