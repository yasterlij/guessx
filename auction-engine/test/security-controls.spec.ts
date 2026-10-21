jest.mock("uuid", () => ({
  v4: () => "mock-uuid-v4",
}));

import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ImageService } from "../src/modules/admin/image.service";
import { JwtAuthGuard } from "../src/modules/common/jwt-auth.guard";
import { BidEncryptionService } from "../src/modules/common/bid-encryption.service";

describe("Auction Engine Security Controls", () => {
  describe("ImageService SSRF Protection", () => {
    let service: ImageService;
    const mockConfigService = {
      get: jest.fn().mockReturnValue("http://localhost:3000"),
    };

    beforeEach(() => {
      service = new ImageService(mockConfigService as unknown as ConfigService);
    });

    it("should reject non-HTTPS URLs", async () => {
      const result = await service.downloadImage("http://example.com/test.jpg");
      expect(result).toBeNull();
    });

    it("should reject loopback and private IPv4 addresses", async () => {
      expect(await service.downloadImage("https://127.0.0.1/test.jpg")).toBeNull();
      expect(await service.downloadImage("https://10.0.0.1/test.jpg")).toBeNull();
      expect(await service.downloadImage("https://172.16.0.1/test.jpg")).toBeNull();
      expect(await service.downloadImage("https://192.168.1.1/test.jpg")).toBeNull();
      expect(await service.downloadImage("https://169.254.169.254/latest/meta-data")).toBeNull();
    });

    it("should reject disallowed file extensions", async () => {
      expect(await service.downloadImage("https://example.com/script.sh")).toBeNull();
      expect(await service.downloadImage("https://example.com/exploit.exe")).toBeNull();
      expect(await service.downloadImage("https://example.com/backdoor.php")).toBeNull();
    });
  });

  describe("JwtAuthGuard Banned User Enforcement", () => {
    let guard: JwtAuthGuard;
    let mockJwtService: { verifyAsync: jest.Mock };
    let mockRedis: { sismember: jest.Mock };

    beforeEach(() => {
      mockJwtService = {
        verifyAsync: jest.fn(),
      };
      mockRedis = {
        sismember: jest.fn(),
      };
      guard = new JwtAuthGuard(
        mockJwtService as unknown as JwtService,
        mockRedis as any,
      );
    });

    function createMockContext(authHeader?: string) {
      const request: any = {
        headers: {
          authorization: authHeader,
        },
      };
      return {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as any;
    }

    it("should reject requests without authorization header", async () => {
      await expect(guard.canActivate(createMockContext())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should reject requests when is_banned is true in JWT", async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: "user-1",
        is_banned: true,
      });

      await expect(
        guard.canActivate(createMockContext("Bearer valid-token")),
      ).rejects.toThrow("User account is banned");
    });

    it("should reject requests when user is in Redis guessx:banned-users set", async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: "user-2",
        is_banned: false,
      });
      mockRedis.sismember.mockResolvedValue(1);

      await expect(
        guard.canActivate(createMockContext("Bearer valid-token")),
      ).rejects.toThrow("User account is banned");
      expect(mockRedis.sismember).toHaveBeenCalledWith(
        "guessx:banned-users",
        "user-2",
      );
    });

    it("should allow active non-banned users", async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: "user-3",
        is_banned: false,
        role: "user",
      });
      mockRedis.sismember.mockResolvedValue(0);

      const ctx = createMockContext("Bearer valid-token");
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(ctx.switchToHttp().getRequest().user.id).toBe("user-3");
    });
  });

  describe("BidEncryptionService AES-256-GCM Controls", () => {
    let service: BidEncryptionService;

    beforeEach(() => {
      process.env.BID_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
      service = new BidEncryptionService();
    });

    it("should successfully encrypt and decrypt numeric amounts", () => {
      const amount = 145.75;
      const encrypted = service.encrypt(amount);
      expect(encrypted).toBeDefined();
      expect(encrypted.split(":")).toHaveLength(3);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(amount);
    });

    it("should reject malformed or tampered encrypted data", () => {
      expect(() => service.decrypt("")).toThrow("Invalid encrypted payload");
      expect(() => service.decrypt("invalid-string")).toThrow("Malformed encrypted bid format");
    });
  });

  describe("BiddingService Business Logic Limits", () => {
    it("should throw an error when Redis client lacks Lua scripting capability", async () => {
      const { BiddingService } = await import(
        "../src/modules/bidding/bidding.service"
      );
      const mockRedisWithoutEval: any = {};
      const service = new BiddingService(
        {} as any,
        {} as any,
        {} as any,
        mockRedisWithoutEval,
        {} as any,
        {} as any,
      );

      await expect(
        (service as any).trackBidInRedis(
          "auc-1",
          "user-1",
          50,
          new Date(Date.now() + 60000),
        ),
      ).rejects.toThrow("Redis Lua scripting is required");
    });

    it("should enforce MAX_BIDS_PER_USER_PER_AUCTION = 150 limit when placing bids", async () => {
      const { BiddingService } = await import(
        "../src/modules/bidding/bidding.service"
      );
      const mockRedis = {
        set: jest.fn().mockResolvedValue("OK"),
        eval: jest.fn().mockResolvedValue(1),
        del: jest.fn(),
      };
      const mockBidRepo = {
        count: jest.fn().mockResolvedValue(150),
      };
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ id: "tx-fee-paid" }),
      };

      const service = new BiddingService(
        mockRedis as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        mockBidRepo as any,
        mockTxRepo as any,
      );

      await expect(
        service.placeBid(
          "auc-1",
          "user-1",
          50,
          new Date(Date.now() + 60000),
          "TICKET-1",
        ),
      ).rejects.toThrow("Maximum 150 bids per auction reached");
    });
  });

  describe("AuctionClosureService Extension Cap Controls", () => {
    it("should expire auction instead of extending when MAX_AUCTION_EXTENSIONS is reached", async () => {
      const { AuctionClosureService } = await import(
        "../src/modules/winner/auction-closure.service"
      );
      const { AuctionStatus: AS } = await import(
        "../src/modules/winner/entities/auction.entity"
      );

      const mockAuction = {
        id: "auc-ext",
        status: AS.ACTIVE,
        extensions: 10,
        min_bid: 10,
        end_time: new Date(Date.now() - 5000),
      };

      const mockRepo = {
        find: jest.fn().mockResolvedValue([mockAuction]),
        findOne: jest.fn().mockResolvedValue(mockAuction),
        save: jest.fn().mockImplementation(async (a) => a),
      };
      const mockBidRepo = {
        count: jest.fn().mockResolvedValue(2),
      };
      const mockWinnerService = {
        calculateWinners: jest.fn().mockResolvedValue({
          winningAmounts: [],
          totalBids: 2,
          winners: [],
        }),
        getUniqueBiddersCount: jest.fn().mockResolvedValue(2),
        cleanupAuctionKeys: jest.fn().mockResolvedValue(undefined),
      };
      const mockBullMqWorker = {
        flushAuction: jest.fn().mockResolvedValue(undefined),
      };
      const mockEvents = {
        notifyExtension: jest.fn().mockResolvedValue(undefined),
        notifyFairPlayExtension: jest.fn().mockResolvedValue(undefined),
        notifyLimitedBiddersExtension: jest.fn().mockResolvedValue(undefined),
        notifyAdminNoBiddersClosed: jest.fn().mockResolvedValue(undefined),
        logClosureEvent: jest.fn().mockResolvedValue(undefined),
      };
      const mockRedis = {
        ttl: jest.fn().mockResolvedValue(100),
      };

      const closureService = new AuctionClosureService(
        mockRepo as any,
        mockBidRepo as any,
        {} as any,
        mockWinnerService as any,
        mockBullMqWorker as any,
        {} as any,
        mockRedis as any,
        mockEvents as any,
      );

      await closureService.closeExpiredAuctions();

      expect(mockAuction.status).toBe(AS.CLOSED);
      expect(mockWinnerService.cleanupAuctionKeys).toHaveBeenCalledWith("auc-ext");
      expect(mockEvents.notifyExtension).not.toHaveBeenCalled();
    });
  });

  describe("Webhook Error Status Controls", () => {
    it("should return HTTP 500 when Awash webhook processing throws an unexpected error", async () => {
      const { AwashWebhookController } = await import(
        "../src/modules/payment/awash-webhook.controller"
      );
      const mockPaymentService = {
        handleSuccessfulPayment: jest.fn().mockRejectedValue(new Error("DB failure")),
      };
      const mockAwashService = {
        verifyWebhookSignature: jest.fn().mockReturnValue(true),
      };
      const controller = new AwashWebhookController(
        mockAwashService as any,
        mockPaymentService as any,
      );

      const mockReq: any = {
        headers: { "awash-signature": "test-signature" },
        rawBody: JSON.stringify({
          eventType: "payment.successful",
          clientReferenceId: "ref-1",
          transactionId: "pay-1",
        }),
      };

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.handleWebhook(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Webhook processing failed" });
    });
  });

  describe("BiddingController Separation of Duties", () => {
    it("should prevent administrators from placing bids on auctions", async () => {
      const { BiddingController } = await import(
        "../src/modules/bidding/bidding.controller"
      );
      const controller = new BiddingController(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );

      const mockReq = {
        user: { id: "admin-user", role: "admin" },
        auction: { end_time: new Date(Date.now() + 60000), product: { name: "Test" } },
      };

      await expect(
        controller.placeBid("auc-1", { amount: 100 } as any, mockReq as any),
      ).rejects.toThrow("Administrators are not allowed to participate in bidding.");
    });

    it("should prevent an admin from initiating a bid fee payment link", async () => {
      const { PaymentController } = await import(
        "../src/modules/payment/payment.controller"
      );
      const controller = new PaymentController(
        {} as any,
        { get: () => 1 } as any,
        {} as any,
      );

      const mockReq = {
        user: { id: "admin-user", role: "admin" },
      };

      await expect(
        controller.createBidFeePaymentLink("auc-1", mockReq as any),
      ).rejects.toThrow("Administrators are not allowed to participate in bidding.");
    });

    it("should prevent an admin from paying bid fee with wallet", async () => {
      const { PaymentController } = await import(
        "../src/modules/payment/payment.controller"
      );
      const controller = new PaymentController(
        {} as any,
        { get: () => 1 } as any,
        {} as any,
      );

      const mockReq = {
        user: { id: "admin-user", role: "admin" },
      };

      await expect(
        controller.payBidFeeWithWallet("auc-1", mockReq as any),
      ).rejects.toThrow("Administrators are not allowed to participate in bidding.");
    });
  });

  describe("AuctionAdminService Conflict of Interest Controls", () => {
    it("should prevent an admin who placed bids from closing that auction early", async () => {
      const { AuctionAdminService } = await import(
        "../src/modules/admin/auction-admin.service"
      );
      const { AuctionStatus } = await import(
        "../src/modules/winner/entities/auction.entity"
      );

      const mockAuctionRepo = {
        findOne: jest.fn().mockResolvedValue({ id: "auc-1", status: AuctionStatus.ACTIVE }),
      };
      const mockBidRepo = {
        findOne: jest.fn().mockResolvedValue({ id: "bid-1", user_id: "admin-actor", amount: 50 }),
      };

      const service = new AuctionAdminService(
        {} as any,
        {} as any,
        {} as any,
        mockAuctionRepo as any,
        {} as any,
        mockBidRepo as any,
      );

      await expect(
        service.closeAuctionEarly("auc-1", "admin-actor"),
      ).rejects.toThrow("Conflict of interest");
    });
  });

  describe("PaymentService Concurrency Lock Controls", () => {
    it("should reject concurrent bid fee payments when distributed lock is held", async () => {
      const { PaymentService } = await import(
        "../src/modules/payment/payment.service"
      );
      const mockRedis = {
        set: jest.fn().mockResolvedValue(null), // lock already held
      };
      const service = new PaymentService(
        {} as any,
        {} as any,
        {} as any,
        mockRedis as any,
        {} as any,
        {} as any,
      );

      await expect(
        service.createBidFeeWalletPayment("auc-1", "user-1", 50),
      ).rejects.toThrow("Bid fee payment is currently being processed");
    });
  });

  describe("PaymentController Wallet PIN Enforcement", () => {
    it("should reject payBidFeeWithWallet when PIN verification session is absent", async () => {
      const { PaymentController } = await import(
        "../src/modules/payment/payment.controller"
      );
      const { AuctionStatus: AS } = await import(
        "../src/modules/winner/entities/auction.entity"
      );

      const mockAuctionRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "auc-pin",
          status: AS.ACTIVE,
          end_time: new Date(Date.now() + 60000),
          bid_fee: 10,
        }),
      };
      const mockPaymentService = {
        createBidFeeWalletPayment: jest.fn(),
      };
      const mockConfigService = {
        get: jest.fn().mockReturnValue(10),
      };
      const mockRedis = {
        get: jest.fn().mockResolvedValue(null), // no PIN verification session
        del: jest.fn(),
      };

      const controller = new PaymentController(
        mockPaymentService as any,
        mockConfigService as any,
        mockAuctionRepo as any,
        mockRedis as any,
      );

      await expect(
        controller.payBidFeeWithWallet("auc-pin", {
          user: { id: "user-unverified", role: "user" },
        }),
      ).rejects.toThrow("Wallet PIN verification required");
      expect(mockPaymentService.createBidFeeWalletPayment).not.toHaveBeenCalled();
    });

    it("should allow payBidFeeWithWallet and consume session when PIN verification session is present", async () => {
      const { PaymentController } = await import(
        "../src/modules/payment/payment.controller"
      );
      const { AuctionStatus: AS } = await import(
        "../src/modules/winner/entities/auction.entity"
      );

      const mockAuctionRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: "auc-pin",
          status: AS.ACTIVE,
          end_time: new Date(Date.now() + 60000),
          bid_fee: 10,
        }),
      };
      const mockPaymentService = {
        createBidFeeWalletPayment: jest.fn().mockResolvedValue(undefined),
      };
      const mockConfigService = {
        get: jest.fn().mockReturnValue(10),
      };
      const mockRedis = {
        get: jest.fn().mockResolvedValue("1"), // valid session present
        del: jest.fn().mockResolvedValue(1),
      };

      const controller = new PaymentController(
        mockPaymentService as any,
        mockConfigService as any,
        mockAuctionRepo as any,
        mockRedis as any,
      );

      const res = await controller.payBidFeeWithWallet("auc-pin", {
        user: { id: "user-verified", role: "user" },
      });

      expect(res).toEqual({ paid: true });
      expect(mockRedis.del).toHaveBeenCalledWith(
        "guessx:wallet:pin-verified:user-verified",
      );
      expect(mockPaymentService.createBidFeeWalletPayment).toHaveBeenCalledWith(
        "auc-pin",
        "user-verified",
        10,
      );
    });
  });

  describe("Auction Closure & Extension Rules (BL-01 to BL-05)", () => {
    let closureService: any;
    let mockAuctionRepo: any;
    let mockBidRepo: any;
    let mockWinnerRepo: any;
    let mockWinnerService: any;
    let mockBullMqWorker: any;
    let mockBidEncryptionService: any;
    let mockRedis: any;
    let mockClosureEventsService: any;

    beforeEach(async () => {
      const { AuctionClosureService } = await import(
        "../src/modules/winner/auction-closure.service"
      );

      mockAuctionRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        save: jest.fn().mockImplementation(async (a) => a),
        manager: {
          connection: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn().mockImplementation(async (a) => a),
                find: jest.fn().mockResolvedValue([]),
              },
            }),
          },
        },
      };

      mockBidRepo = {
        count: jest.fn().mockResolvedValue(0),
      };

      mockWinnerRepo = {
        find: jest.fn().mockResolvedValue([]),
      };

      mockWinnerService = {
        calculateWinners: jest.fn().mockResolvedValue({
          winningAmounts: [],
          totalBids: 0,
          winners: [],
        }),
        getUniqueBiddersCount: jest.fn().mockResolvedValue(0),
        cleanupAuctionKeys: jest.fn().mockResolvedValue(undefined),
        persistWinners: jest.fn().mockResolvedValue([]),
      };

      mockBullMqWorker = {
        flushAuction: jest.fn().mockResolvedValue(undefined),
      };

      mockBidEncryptionService = {
        decrypt: jest.fn().mockReturnValue("1.00"),
      };

      mockRedis = {
        multi: jest.fn().mockReturnValue({
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        }),
      };

      mockClosureEventsService = {
        notifyNoBiddersExtension: jest.fn().mockResolvedValue(undefined),
        notifyLimitedBiddersExtension: jest.fn().mockResolvedValue(undefined),
        notifyAdminNoBiddersClosed: jest.fn().mockResolvedValue(undefined),
        notifyExtension: jest.fn().mockResolvedValue(undefined),
        notifyFairPlayExtension: jest.fn().mockResolvedValue(undefined),
        notifyForcedClosure: jest.fn().mockResolvedValue(undefined),
        logClosureEvent: jest.fn().mockResolvedValue(undefined),
        notifyWinners: jest.fn().mockResolvedValue(undefined),
      };

      closureService = new AuctionClosureService(
        mockAuctionRepo as any,
        mockBidRepo as any,
        mockWinnerRepo as any,
        mockWinnerService as any,
        mockBullMqWorker as any,
        mockBidEncryptionService as any,
        mockRedis as any,
        mockClosureEventsService as any,
      );
    });

    it("Rule 1 & 2: should extend by 7 days on 0 bidders when extensions < 10, without placing in winners list", async () => {
      const { AuctionStatus: AS } = await import(
        "../src/modules/winner/entities/auction.entity"
      );
      const auction = {
        id: "auc-no-bids",
        status: AS.ACTIVE,
        end_time: new Date(Date.now() - 1000),
        extensions: 0,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };

      mockAuctionRepo.find.mockResolvedValue([auction]);
      await closureService.closeExpiredAuctions();

      expect(auction.extensions).toBe(1);
      const extendedDays = (auction.end_time.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(extendedDays).toBeGreaterThan(6.8);
      expect(extendedDays).toBeLessThanOrEqual(7.1);
      expect(mockAuctionRepo.save).toHaveBeenCalledWith(auction);
      expect(mockClosureEventsService.notifyNoBiddersExtension).toHaveBeenCalledWith("auc-no-bids", 1);
      expect(mockWinnerService.persistWinners).not.toHaveBeenCalled();
    });

    it("Rule 3: after 10th extension with 0 bidders, closes permanently and notifies admin with days open", async () => {
      const { AuctionStatus: AS } = await import(
        "../src/modules/winner/entities/auction.entity"
      );
      const createdAt = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000); // 70 days open
      const auction = {
        id: "auc-max-ext",
        status: AS.ACTIVE,
        end_time: new Date(Date.now() - 1000),
        extensions: 10,
        created_at: createdAt,
      };

      mockAuctionRepo.find.mockResolvedValue([auction]);
      await closureService.closeExpiredAuctions();

      expect(auction.status).toBe(AS.CLOSED);
      expect(mockWinnerService.cleanupAuctionKeys).toHaveBeenCalledWith("auc-max-ext");
      expect(mockClosureEventsService.notifyAdminNoBiddersClosed).toHaveBeenCalledWith(
        "auc-max-ext",
        expect.any(Number),
        0,
      );
      const daysArg = mockClosureEventsService.notifyAdminNoBiddersClosed.mock.calls[0][1];
      expect(daysArg).toBeGreaterThanOrEqual(69);
      expect(mockClosureEventsService.logClosureEvent).toHaveBeenCalledWith(
        "auc-max-ext",
        "NO_BIDDERS_FINAL_CLOSE",
        [],
      );
    });

    it("Rule 4: extends weekly by 7 days when bidders < 100 until reaching 10 extensions", async () => {
      const { AuctionStatus: AS } = await import(
        "../src/modules/winner/entities/auction.entity"
      );
      mockWinnerService.calculateWinners.mockResolvedValue({
        winningAmounts: [1.25],
        totalBids: 45,
        winners: [{ amount: 1.25, userId: "u-1" }],
      });
      mockWinnerService.getUniqueBiddersCount.mockResolvedValue(45); // < 100 bidders

      const auction = {
        id: "auc-limited-bids",
        status: AS.ACTIVE,
        end_time: new Date(Date.now() - 1000),
        extensions: 3,
        created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      };

      mockAuctionRepo.find.mockResolvedValue([auction]);
      await closureService.closeExpiredAuctions();

      expect(auction.extensions).toBe(4);
      const extendedDays = (auction.end_time.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(extendedDays).toBeGreaterThan(6.8);
      expect(mockClosureEventsService.notifyLimitedBiddersExtension).toHaveBeenCalledWith(
        "auc-limited-bids",
        45,
        4,
      );
      expect(mockWinnerService.persistWinners).not.toHaveBeenCalled();
    });

    it("Rule 4 to Rule 3: closes permanently and notifies admin when bidders < 100 and reaches 10 extensions", async () => {
      const { AuctionStatus: AS } = await import(
        "../src/modules/winner/entities/auction.entity"
      );
      mockWinnerService.calculateWinners.mockResolvedValue({
        winningAmounts: [1.25],
        totalBids: 80,
        winners: [{ amount: 1.25, userId: "u-1" }],
      });
      mockWinnerService.getUniqueBiddersCount.mockResolvedValue(80); // < 100 bidders

      const auction = {
        id: "auc-limited-max",
        status: AS.ACTIVE,
        end_time: new Date(Date.now() - 1000),
        extensions: 10,
        created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      };

      mockAuctionRepo.find.mockResolvedValue([auction]);
      await closureService.closeExpiredAuctions();

      expect(auction.status).toBe(AS.CLOSED);
      expect(mockClosureEventsService.notifyAdminNoBiddersClosed).toHaveBeenCalledWith(
        "auc-limited-max",
        expect.any(Number),
        80,
      );
      expect(mockWinnerService.persistWinners).not.toHaveBeenCalled();
    });
  });
});



