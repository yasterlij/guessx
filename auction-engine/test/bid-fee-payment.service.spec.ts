import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { PaymentService } from "../src/modules/payment/payment.service";
import { SikinaService } from "../src/modules/payment/sikina.service";
import { AwashService } from "../src/modules/payment/awash.service";
import { REDIS_CLIENT } from "../src/modules/common/redis.decorator";
import {
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentType,
} from "../src/modules/payment/entities/payment-transaction.entity";
import { Auction } from "../src/modules/winner/entities/auction.entity";
import { Bid } from "../src/modules/bidding/entities/bid.entity";
import {
  Winner,
  WinnerPaymentStatus,
} from "../src/modules/winner/entities/winner.entity";
import { WinnerService } from "../src/modules/winner/winner.service";
import { BidEncryptionService } from "../src/modules/common/bid-encryption.service";
import { NotificationDispatchService } from "../src/modules/worker/notification-dispatch.service";
import { PaymentLinkService } from "../src/modules/payment/payment-link.service";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    increment: jest.fn(),
  };
}

describe("PaymentService - Bid Fee Payment", () => {
  let service: PaymentService;
  let mockPaymentTransactionRepo: ReturnType<typeof createMockRepo>;
  let mockAuctionRepo: ReturnType<typeof createMockRepo>;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockWinnerRepo: ReturnType<typeof createMockRepo>;
  let mockSikinaService: Partial<SikinaService>;
  let mockAwashService: Partial<AwashService>;
  let mockWinnerService: Partial<WinnerService>;
  let mockConfigService: Partial<ConfigService>;
  let mockNotificationDispatchService: { dispatch: jest.Mock };

  beforeEach(async () => {
    mockPaymentTransactionRepo = createMockRepo();
    mockAuctionRepo = createMockRepo();
    mockBidRepo = createMockRepo();
    mockWinnerRepo = createMockRepo();

    mockSikinaService = {
      generatePaymentLink: jest.fn(),
      getPaymentStatus: jest.fn(),
    };

    mockAwashService = {
      generatePaymentLink: jest.fn(),
      getPaymentStatus: jest.fn(),
    };

    mockWinnerService = {
      updateWinnerPaymentStatus: jest.fn(),
      getNextUnpaidWinner: jest.fn(),
      calculateWinners: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          "app.sikinaSuccessRedirectUrl": "https://example.com/success",
          "app.sikinaFailedRedirectUrl": "https://example.com/failed",
          "app.appBaseUrl": "http://localhost:5173",
        };
        return config[key];
      }),
    };

    mockNotificationDispatchService = {
      dispatch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentLinkService,
        PaymentService,
        { provide: getRepositoryToken(Auction), useValue: mockAuctionRepo },
        { provide: getRepositoryToken(Bid), useValue: mockBidRepo },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: mockPaymentTransactionRepo,
        },
        { provide: getRepositoryToken(Winner), useValue: mockWinnerRepo },
        { provide: WinnerService, useValue: mockWinnerService },
        { provide: SikinaService, useValue: mockSikinaService },
        { provide: AwashService, useValue: mockAwashService },
        { provide: ConfigService, useValue: mockConfigService },
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
        {
          provide: REDIS_CLIENT,
          useValue: {
            set: jest.fn(),
            del: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe("createBidFeePaymentLink", () => {
    it("should create a bid fee payment link successfully", async () => {
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";
      const userId = "af372c9d-2d80-4db9-ae53-e3bc47531f12";
      const amount = 50;

      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);

      const mockSikinaResponse = {
        paymentUrl: "https://sandbox.sikinapay.com/checkout/web/TEST123",
        responseCode: "0",
        responseStatus: "SUCCESS",
        responseMessage: "Success",
        currentDate: "2026-07-22",
        currentTime: "12:00:00",
      };
      (mockSikinaService.generatePaymentLink as jest.Mock).mockResolvedValue(
        mockSikinaResponse,
      );

      const mockTransaction = {
        id: "txn-123",
        auction_id: auctionId,
        user_id: userId,
        amount,
        client_reference_id: "fee-bef09c86-af372c9d-1234567890",
        sikina_payment_url: mockSikinaResponse.paymentUrl,
        status: PaymentTransactionStatus.PENDING,
        currency: "ETB",
        payment_type: PaymentType.BID_FEE,
      };
      mockPaymentTransactionRepo.create.mockReturnValue(mockTransaction);
      mockPaymentTransactionRepo.save.mockResolvedValue(mockTransaction);

      const result = await service.createBidFeePaymentLink(
        auctionId,
        userId,
        amount,
      );

      expect(result).toEqual({
        paymentUrl: mockSikinaResponse.paymentUrl,
        proxyUrl: expect.any(String),
        transactionId: "txn-123",
      });

      expect(mockSikinaService.generatePaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          amount,
          description: `Bid fee for auction ${auctionId}`,
          language: "en",
        }),
      );

      expect(mockPaymentTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auction_id: auctionId,
          user_id: userId,
          amount,
          payment_type: PaymentType.BID_FEE,
          status: PaymentTransactionStatus.PENDING,
        }),
      );
    });

    it("should return existing pending payment link if found", async () => {
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";
      const userId = "af372c9d-2d80-4db9-ae53-e3bc47531f12";
      const amount = 50;

      const existingTransaction = {
        id: "txn-existing",
        sikina_payment_url:
          "https://sandbox.sikinapay.com/checkout/web/EXISTING",
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(existingTransaction);

      const result = await service.createBidFeePaymentLink(
        auctionId,
        userId,
        amount,
      );

      expect(result).toEqual({
        paymentUrl: existingTransaction.sikina_payment_url,
        proxyUrl: expect.any(String),
        transactionId: existingTransaction.id,
      });

      expect(mockSikinaService.generatePaymentLink).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepo.create).not.toHaveBeenCalled();
    });

    it("should reuse an existing pending winning payment link", async () => {
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";
      const userId = "af372c9d-2d80-4db9-ae53-e3bc47531f12";
      const existingTransaction = {
        id: "txn-winning-existing",
        awash_payment_url: "https://awash.example/checkout/existing",
      };

      mockPaymentTransactionRepo.findOne.mockResolvedValue(existingTransaction);

      const result = await service.createPaymentLink(
        auctionId,
        userId,
        150,
        "Winning payment",
        "AWASH",
      );

      expect(result).toEqual({
        paymentUrl: existingTransaction.awash_payment_url,
        proxyUrl: expect.any(String),
        transactionId: existingTransaction.id,
      });

      expect(mockAwashService.generatePaymentLink).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepo.create).not.toHaveBeenCalled();
    });

    it("should scope pending winning link reuse to winning payment transactions only", async () => {
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";
      const userId = "af372c9d-2d80-4db9-ae53-e3bc47531f12";

      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);
      (mockAwashService.generatePaymentLink as jest.Mock).mockResolvedValue({
        paymentUrl: "https://awash.example/checkout/new",
      });
      mockPaymentTransactionRepo.create.mockReturnValue({ id: "txn-new" });
      mockPaymentTransactionRepo.save.mockResolvedValue({ id: "txn-new" });

      await service.createPaymentLink(
        auctionId,
        userId,
        120,
        "Winning payment",
        "AWASH",
      );

      expect(mockPaymentTransactionRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            auction_id: auctionId,
            user_id: userId,
            payment_type: PaymentType.WINNING_BID,
            status: PaymentTransactionStatus.PENDING,
          }),
        }),
      );
    });
  });

  describe("getBidFeePaymentStatus", () => {
    it("should return SUCCESSFUL status when payment is successful", async () => {
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";
      const userId = "af372c9d-2d80-4db9-ae53-e3bc47531f12";

      const mockTransaction = {
        status: PaymentTransactionStatus.SUCCESSFUL,
        sikina_payment_url:
          "https://sandbox.sikinapay.com/checkout/web/TEST123",
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getBidFeePaymentStatus(auctionId, userId);

      expect(result).toEqual({
        status: "SUCCESSFUL",
        payment_url: mockTransaction.sikina_payment_url,
      });

      expect(mockPaymentTransactionRepo.findOne).toHaveBeenCalledWith({
        where: {
          auction_id: auctionId,
          user_id: userId,
          payment_type: PaymentType.BID_FEE,
        },
        order: { created_at: "DESC" },
      });
    });

    it("should return NONE status when no payment found", async () => {
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";
      const userId = "af372c9d-2d80-4db9-ae53-e3bc47531f12";

      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);

      const result = await service.getBidFeePaymentStatus(auctionId, userId);

      expect(result).toEqual({
        status: "NONE",
        payment_url: null,
      });
    });

    it("should return PENDING status when payment is pending", async () => {
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";
      const userId = "af372c9d-2d80-4db9-ae53-e3bc47531f12";

      const mockTransaction = {
        status: PaymentTransactionStatus.PENDING,
        sikina_payment_url:
          "https://sandbox.sikinapay.com/checkout/web/TEST123",
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getBidFeePaymentStatus(auctionId, userId);

      expect(result).toEqual({
        status: "PENDING",
        payment_url: mockTransaction.sikina_payment_url,
      });
    });
  });

  describe("handleSuccessfulPayment", () => {
    it("should mark auction as paid for WINNING_BID payment type", async () => {
      const clientReferenceId = "pay-bef09c86-1234567890";
      const paymentReferenceId = "sikina-ref-123";
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";

      const mockTransaction = {
        id: "txn-123",
        client_reference_id: clientReferenceId,
        auction_id: auctionId,
        user_id: "user-123",
        payment_type: PaymentType.WINNING_BID,
        status: PaymentTransactionStatus.PENDING,
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockPaymentTransactionRepo.save.mockResolvedValue({
        ...mockTransaction,
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockPaymentTransactionRepo.update.mockResolvedValue({ affected: 1 });

      const mockAuction = {
        id: auctionId,
        status: "CLOSED",
        payment_status: "PENDING",
      };
      mockAuctionRepo.findOne.mockResolvedValue(mockAuction);
      mockAuctionRepo.save.mockResolvedValue({
        ...mockAuction,
        payment_status: "PAID",
      });
      mockWinnerRepo.count.mockResolvedValue(0);

      await service.handleSuccessfulPayment(
        clientReferenceId,
        paymentReferenceId,
        {},
      );

      expect(mockPaymentTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentTransactionStatus.SUCCESSFUL,
          sikina_payment_reference_id: paymentReferenceId,
        }),
      );

      expect(mockAuctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: "PAID",
        }),
      );
    });

    it("should NOT mark auction as paid for BID_FEE payment type", async () => {
      const clientReferenceId = "fee-bef09c86-af372c9d-1234567890";
      const paymentReferenceId = "sikina-ref-456";
      const auctionId = "bef09c86-21da-4db7-b02e-933f8fb83132";

      const mockTransaction = {
        id: "txn-456",
        client_reference_id: clientReferenceId,
        auction_id: auctionId,
        user_id: "user-456",
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.PENDING,
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue({
        ...mockTransaction,
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockPaymentTransactionRepo.save.mockResolvedValue({
        ...mockTransaction,
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockPaymentTransactionRepo.update.mockResolvedValue({ affected: 1 });

      await service.handleSuccessfulPayment(
        clientReferenceId,
        paymentReferenceId,
        {},
      );

      expect(mockPaymentTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentTransactionStatus.SUCCESSFUL,
        }),
      );

      expect(mockAuctionRepo.save).not.toHaveBeenCalled();
    });

    it("should skip processing when the payment is already marked successful", async () => {
      const clientReferenceId = "pay-existing-success";

      mockPaymentTransactionRepo.update.mockResolvedValue({ affected: 0 });

      await service.handleSuccessfulPayment(
        clientReferenceId,
        "payment-ref",
        {},
      );

      expect(mockPaymentTransactionRepo.findOne).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepo.save).not.toHaveBeenCalled();
      expect(mockAuctionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("getWinningPaymentStatus", () => {
    it("should scope status lookup to winning transaction types", async () => {
      const auctionId = "auction-winning-1";
      const userId = "user-winning-1";

      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);

      await service.getWinningPaymentStatus(auctionId, userId);

      const args = mockPaymentTransactionRepo.findOne.mock.calls[0][0];
      expect(args.where.auction_id).toBe(auctionId);
      expect(args.where.user_id).toBe(userId);
      expect(args.where.payment_type).toBeDefined();
    });
  });

  describe("confirmWinningPayment", () => {
    it("should reject manual confirmation when no successful winning payment exists", async () => {
      const auctionId = "auction-confirm-1";
      const userId = "user-confirm-1";

      mockAuctionRepo.findOne.mockResolvedValue({
        id: auctionId,
        winner_user_id: userId,
        payment_status: "PENDING",
      });
      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.confirmWinningPayment(auctionId, userId),
      ).rejects.toThrow("Winning payment not yet confirmed");
    });

    it("should mark the current winner as paid when a successful winning payment exists", async () => {
      const auctionId = "auction-confirm-2";
      const userId = "user-confirm-2";

      mockAuctionRepo.findOne
        .mockResolvedValueOnce({
          id: auctionId,
          status: "CLOSED",
          winner_user_id: userId,
          payment_status: "PENDING",
        })
        .mockResolvedValueOnce({
          id: auctionId,
          status: "CLOSED",
          winner_user_id: userId,
          payment_status: "PENDING",
        });
      mockPaymentTransactionRepo.findOne.mockResolvedValue({
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.WINNING_BID,
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockWinnerRepo.findOne.mockResolvedValue({
        auction_id: auctionId,
        user_id: userId,
        payment_status: WinnerPaymentStatus.PENDING,
      });
      mockWinnerRepo.count.mockResolvedValue(0);
      mockAuctionRepo.save.mockResolvedValue({
        id: auctionId,
        payment_status: "PAID",
      });

      await service.confirmWinningPayment(auctionId, userId);

      expect(mockWinnerService.updateWinnerPaymentStatus).toHaveBeenCalledWith(
        auctionId,
        userId,
        WinnerPaymentStatus.PAID,
      );
      expect(mockAuctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ payment_status: "PAID" }),
      );
    });

    it("should promote the next unpaid winner when more payments remain", async () => {
      const auctionId = "auction-confirm-3";
      const userId = "user-confirm-3";
      const nextWinner = {
        auction_id: auctionId,
        user_id: "user-confirm-4",
        amount: 19.5,
        payment_status: WinnerPaymentStatus.PENDING,
        payment_deadline: null,
      };

      mockAuctionRepo.findOne
        .mockResolvedValueOnce({
          id: auctionId,
          status: "CLOSED",
          winner_user_id: userId,
          winning_bid_amount: 17.25,
          payment_status: "PENDING",
        })
        .mockResolvedValueOnce({
          id: auctionId,
          status: "CLOSED",
          winner_user_id: userId,
          winning_bid_amount: 17.25,
          payment_status: "PENDING",
        });
      mockPaymentTransactionRepo.findOne.mockResolvedValue({
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.WINNING_BID,
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockWinnerRepo.findOne.mockResolvedValue({
        auction_id: auctionId,
        user_id: userId,
        payment_status: WinnerPaymentStatus.PENDING,
      });
      mockWinnerRepo.count.mockResolvedValue(1);
      (mockWinnerService.getNextUnpaidWinner as jest.Mock).mockResolvedValue(
        nextWinner,
      );
      mockWinnerRepo.save.mockResolvedValue(nextWinner);
      mockAuctionRepo.save.mockResolvedValue({
        id: auctionId,
        winner_user_id: nextWinner.user_id,
        winning_bid_amount: nextWinner.amount,
        payment_status: "PENDING",
      });

      await service.confirmWinningPayment(auctionId, userId);

      expect(mockWinnerService.updateWinnerPaymentStatus).toHaveBeenCalledWith(
        auctionId,
        userId,
        WinnerPaymentStatus.PAID,
      );
      expect(mockWinnerService.getNextUnpaidWinner).toHaveBeenCalledWith(
        auctionId,
      );
      expect(mockWinnerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: nextWinner.user_id,
          payment_deadline: expect.any(Date),
        }),
      );
      expect(mockAuctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          winner_user_id: nextWinner.user_id,
          winning_bid_amount: nextWinner.amount,
          payment_status: "PENDING",
          payment_deadline: expect.any(Date),
        }),
      );
    });
  });

  describe("expireOverduePayments", () => {
    beforeEach(() => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    });

    it("reassigns the winner when an overdue payment has a next unpaid winner", async () => {
      const overdueAuction = {
        id: "auction-1",
        status: "CLOSED",
        payment_status: "PENDING",
        payment_deadline: new Date(Date.now() - 60_000),
        winner_user_id: "winner-1",
        product: { name: "Phone" },
      };
      const currentWinner = {
        auction_id: "auction-1",
        user_id: "winner-1",
        payment_status: "PENDING",
      };
      const nextWinner = {
        auction_id: "auction-1",
        user_id: "winner-2",
        amount: 12.5,
        payment_status: "PENDING",
        payment_deadline: null,
      };

      mockAuctionRepo.find.mockResolvedValue([overdueAuction]);
      mockWinnerRepo.findOne.mockResolvedValue(currentWinner);
      (mockWinnerService.getNextUnpaidWinner as jest.Mock).mockResolvedValue(
        nextWinner,
      );
      mockWinnerRepo.save.mockResolvedValue(nextWinner);
      mockAuctionRepo.save.mockResolvedValue({
        ...overdueAuction,
        winner_user_id: "winner-2",
      });

      await service.expireOverduePayments();

      expect(mockWinnerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "winner-1",
          payment_status: WinnerPaymentStatus.EXPIRED,
        }),
      );
      expect(mockAuctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          winner_user_id: "winner-2",
          winning_bid_amount: 12.5,
          payment_status: "PENDING",
        }),
      );
      expect(mockNotificationDispatchService.dispatch).toHaveBeenCalledWith(
        "/api/v1/notify/winner",
        expect.objectContaining({
          user_id: "winner-2",
          auction_id: "auction-1",
          winning_amount: 12.5,
        }),
      );
    });

    it("expires the auction when no unpaid winners remain", async () => {
      const overdueAuction = {
        id: "auction-2",
        status: "CLOSED",
        payment_status: "PENDING",
        payment_deadline: new Date(Date.now() - 60_000),
        winner_user_id: "winner-3",
        product: { name: "Laptop" },
      };
      const currentWinner = {
        auction_id: "auction-2",
        user_id: "winner-3",
        payment_status: "PENDING",
      };

      mockAuctionRepo.find.mockResolvedValue([overdueAuction]);
      mockWinnerRepo.findOne.mockResolvedValue(currentWinner);
      (mockWinnerService.getNextUnpaidWinner as jest.Mock).mockResolvedValue(
        null,
      );
      mockWinnerRepo.save.mockResolvedValue(currentWinner);
      mockWinnerRepo.update.mockResolvedValue({ affected: 1 });
      mockAuctionRepo.save.mockResolvedValue({
        ...overdueAuction,
        status: "EXPIRED",
        payment_status: "EXPIRED",
      });

      await service.expireOverduePayments();

      expect(mockWinnerRepo.update).toHaveBeenCalledWith(
        {
          auction_id: "auction-2",
          payment_status: WinnerPaymentStatus.PENDING,
        },
        { payment_status: WinnerPaymentStatus.EXPIRED },
      );
      expect(mockAuctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "EXPIRED",
          payment_status: "EXPIRED",
        }),
      );
      expect(mockNotificationDispatchService.dispatch).not.toHaveBeenCalledWith(
        "/api/v1/notify/winner",
        expect.anything(),
      );
    });
  });

  describe("reconcilePendingPayments", () => {
    it("marks a pending Sikina transaction successful when the gateway reports success", async () => {
      const txn = {
        id: "txn-reconcile-1",
        auction_id: "auction-10",
        user_id: "user-10",
        client_reference_id: "pay-auction-10-100",
        gateway: "SIKINAPAY",
        payment_type: PaymentType.WINNING_BID,
        status: PaymentTransactionStatus.PENDING,
        created_at: new Date("2026-08-03T10:00:00.000Z"),
      };

      mockPaymentTransactionRepo.find.mockResolvedValue([txn]);
      (mockSikinaService.getPaymentStatus as jest.Mock).mockResolvedValue(
        "SUCCESSFUL",
      );
      mockPaymentTransactionRepo.update.mockResolvedValue({ affected: 1 });
      mockPaymentTransactionRepo.findOne.mockResolvedValue({
        ...txn,
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockPaymentTransactionRepo.save.mockResolvedValue({
        ...txn,
        status: PaymentTransactionStatus.SUCCESSFUL,
      });
      mockAuctionRepo.findOne.mockResolvedValue({
        id: "auction-10",
        payment_status: "PENDING",
      });
      mockAuctionRepo.save.mockResolvedValue({
        id: "auction-10",
        payment_status: "PAID",
      });
      mockWinnerRepo.count.mockResolvedValue(0);

      await service.reconcilePendingPayments();

      expect(mockSikinaService.getPaymentStatus).toHaveBeenCalledWith(
        "pay-auction-10-100",
        "2026-08-03",
      );
      expect(mockPaymentTransactionRepo.update).toHaveBeenCalledWith(
        {
          client_reference_id: "pay-auction-10-100",
          status: expect.anything(),
        },
        expect.objectContaining({
          status: PaymentTransactionStatus.SUCCESSFUL,
        }),
      );
    });

    it("increments retry_count when reconciliation throws", async () => {
      const txn = {
        id: "txn-reconcile-2",
        client_reference_id: "fee-auction-11-101",
        gateway: "AWASH",
        status: PaymentTransactionStatus.PENDING,
        created_at: new Date("2026-08-03T10:00:00.000Z"),
      };

      mockPaymentTransactionRepo.find.mockResolvedValue([txn]);
      (mockAwashService.getPaymentStatus as jest.Mock).mockRejectedValue(
        new Error("gateway down"),
      );

      await service.reconcilePendingPayments();

      expect(mockPaymentTransactionRepo.increment).toHaveBeenCalledWith(
        { id: "txn-reconcile-2" },
        "retry_count",
        1,
      );
    });
  });
});
