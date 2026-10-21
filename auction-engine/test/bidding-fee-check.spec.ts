import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { Redis } from "ioredis";
import { BiddingService } from "../src/modules/bidding/bidding.service";
import { Auction } from "../src/modules/winner/entities/auction.entity";
import { Bid } from "../src/modules/bidding/entities/bid.entity";
import {
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentType,
} from "../src/modules/payment/entities/payment-transaction.entity";
import { AuctionClosureService } from "../src/modules/winner/auction-closure.service";
import { AuctionGateway } from "../src/modules/bidding/gateway/auction.gateway";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { REDIS_CLIENT } from "../src/modules/common/redis.decorator";
import { BidEncryptionService } from "../src/modules/common/bid-encryption.service";
import { NotificationDispatchService } from "../src/modules/worker/notification-dispatch.service";

function createMockRedis(): Partial<Record<keyof Redis, jest.Mock>> {
  return {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    sadd: jest.fn(),
    zincrby: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    eval: jest.fn().mockResolvedValue(1),
    multi: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        [null, 1], // sadd result
        [null, "1"], // zincrby result
      ]),
      sadd: jest.fn().mockReturnThis(),
      zincrby: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zrem: jest.fn().mockReturnThis(),
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
    }),
  };
}

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((x: any) => x),
    save: jest.fn((x: any) => x),
    count: jest.fn().mockResolvedValue(0),
  };
}

describe("BiddingService - Bid Fee Payment Check", () => {
  let service: BiddingService;
  let mockRedis: ReturnType<typeof createMockRedis>;
  let mockAuctionRepo: ReturnType<typeof createMockRepo>;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockPaymentTransactionRepo: ReturnType<typeof createMockRepo>;
  let mockClosureService: Partial<AuctionClosureService>;
  let mockAuctionGateway: Partial<AuctionGateway>;
  let mockBidQueue: Partial<Queue>;
  let mockNotificationDispatchService: { dispatch: jest.Mock };

  beforeEach(async () => {
    mockRedis = createMockRedis();
    mockAuctionRepo = createMockRepo();
    mockBidRepo = createMockRepo();
    mockPaymentTransactionRepo = createMockRepo();

    mockClosureService = {
      closeSingleAuction: jest.fn(),
    };

    mockAuctionGateway = {
      broadcastAuctionUpdate: jest.fn(),
    };

    mockBidQueue = {
      add: jest.fn(),
    };

    mockNotificationDispatchService = {
      dispatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiddingService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: getRepositoryToken(Auction), useValue: mockAuctionRepo },
        { provide: getRepositoryToken(Bid), useValue: mockBidRepo },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: mockPaymentTransactionRepo,
        },
        { provide: AuctionClosureService, useValue: mockClosureService },
        { provide: AuctionGateway, useValue: mockAuctionGateway },
        { provide: "BullQueue_incoming-bids", useValue: mockBidQueue },
        {
          provide: BidEncryptionService,
          useValue: {
            encrypt: jest.fn((a) => String(a)),
            decrypt: jest.fn((e) => parseFloat(e)),
          },
        },
        {
          provide: NotificationDispatchService,
          useValue: mockNotificationDispatchService,
        },
      ],
    }).compile();

    service = module.get<BiddingService>(BiddingService);
  });

  describe("placeBid - Bid Fee Payment Check", () => {
    const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";
    const userId = "af372c9d-2d80-4db9-ae53-e3bc47531f12";
    const amount = 100;
    const endTime = new Date(Date.now() + 3600000); // 1 hour from now

    beforeEach(() => {
      (mockRedis.set as jest.Mock).mockResolvedValue("OK");
      (mockRedis.get as jest.Mock).mockResolvedValue("5");
    });

    it("should allow bid when bid fee has been paid via SikinaPay", async () => {
      const mockTransaction = {
        id: "txn-123",
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.SUCCESSFUL,
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.placeBid(
        auctionId,
        userId,
        amount,
        endTime,
        "test-ticket",
      );

      expect(result).toBeDefined();
      expect(result.newTotalBids).toBe(5);
      expect(mockPaymentTransactionRepo.findOne).toHaveBeenCalledWith({
        where: {
          auction_id: auctionId,
          user_id: userId,
          payment_type: PaymentType.BID_FEE,
          status: PaymentTransactionStatus.SUCCESSFUL,
        },
      });
    });

    it("should reject a duplicate bid amount for the same auction", async () => {
      mockPaymentTransactionRepo.findOne.mockResolvedValue({
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockBidRepo.findOne.mockResolvedValue({
        id: "bid-dup",
        auction_id: auctionId,
        user_id: userId,
        amount,
      });

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow("Duplicate bid detected. Please enter a new amount.");
    });

    it("should reject bid when bid fee has NOT been paid", async () => {
      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow(
        "Bid fee not paid. Please pay the bid fee via SikinaPay before placing a bid.",
      );
    });

    it("should reject bid when bid fee payment is PENDING", async () => {
      // Mock findOne to return null when querying for SUCCESSFUL status
      // (simulating that only a PENDING transaction exists)
      mockPaymentTransactionRepo.findOne.mockImplementation(
        async ({ where }) => {
          if (where.status === PaymentTransactionStatus.SUCCESSFUL) {
            return null;
          }
          return {
            id: "txn-123",
            auction_id: auctionId,
            user_id: userId,
            payment_type: PaymentType.BID_FEE,
            status: PaymentTransactionStatus.PENDING,
          };
        },
      );

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject bid when bid fee payment FAILED", async () => {
      // Mock findOne to return null when querying for SUCCESSFUL status
      // (simulating that only a FAILED transaction exists)
      mockPaymentTransactionRepo.findOne.mockImplementation(
        async ({ where }) => {
          if (where.status === PaymentTransactionStatus.SUCCESSFUL) {
            return null;
          }
          return {
            id: "txn-123",
            auction_id: auctionId,
            user_id: userId,
            payment_type: PaymentType.BID_FEE,
            status: PaymentTransactionStatus.FAILED,
          };
        },
      );

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject bid when auction has closed", async () => {
      const closedEndTime = new Date(Date.now() - 3600000); // 1 hour ago
      mockPaymentTransactionRepo.findOne.mockResolvedValue({
        status: PaymentTransactionStatus.SUCCESSFUL,
      });

      await expect(
        service.placeBid(
          auctionId,
          userId,
          amount,
          closedEndTime,
          "test-ticket",
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.placeBid(
          auctionId,
          userId,
          amount,
          closedEndTime,
          "test-ticket",
        ),
      ).rejects.toThrow("Auction has closed");
    });

    it("should reject bid when auction lock cannot be acquired", async () => {
      (mockRedis.set as jest.Mock).mockResolvedValue(null);

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow("Auction is temporarily locked. Please retry.");
    });

    it("should not check bid fee payment if auction lock fails", async () => {
      (mockRedis.set as jest.Mock).mockResolvedValue(null);

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow();

      expect(mockPaymentTransactionRepo.findOne).not.toHaveBeenCalled();
    });

    it("should release auction lock after successful bid", async () => {
      mockPaymentTransactionRepo.findOne.mockResolvedValue({
        status: PaymentTransactionStatus.SUCCESSFUL,
      });

      await service.placeBid(auctionId, userId, amount, endTime, "test-ticket");

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining("redis.call"),
        1,
        `guessx:auction:${auctionId}:lock`,
        expect.any(String),
      );
    });

    it("should release auction lock even if bid fee check fails", async () => {
      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.placeBid(auctionId, userId, amount, endTime, "test-ticket"),
      ).rejects.toThrow();

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining("redis.call"),
        1,
        `guessx:auction:${auctionId}:lock`,
        expect.any(String),
      );
    });
  });
});
