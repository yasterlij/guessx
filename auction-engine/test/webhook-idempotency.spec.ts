import * as crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AwashService } from "../src/modules/payment/awash.service";
import { SikinaService } from "../src/modules/payment/sikina.service";
import { PaymentService } from "../src/modules/payment/payment.service";
import { REDIS_CLIENT } from "../src/modules/common/redis.decorator";
import { WinnerService } from "../src/modules/winner/winner.service";
import { BidEncryptionService } from "../src/modules/common/bid-encryption.service";
import { NotificationDispatchService } from "../src/modules/worker/notification-dispatch.service";
import { PaymentLinkService } from "../src/modules/payment/payment-link.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { PaymentType } from "@prisma/client";

function sign(secret: string, rawBody: string, t: number): string {
  const v1 = crypto
    .createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("Webhook signature verification", () => {
  const secret = "test-webhook-secret";
  let awash: AwashService;
  let sikina: SikinaService;

  beforeEach(async () => {
    const config = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          "app.awashWebhookSecret": secret,
          "app.awashSecretKey": "sk",
          "app.awashMerchantId": "m",
          "app.awashBaseUrl": "https://example.com",
          "app.sikinaWebhookSecret": secret,
          "app.sikinaSecretKey": "sk",
          "app.sikinaBaseUrl": "https://example.com",
        };
        return map[key];
      }),
    };

    const awashModule: TestingModule = await Test.createTestingModule({
      providers: [AwashService, { provide: ConfigService, useValue: config }],
    }).compile();
    awash = awashModule.get(AwashService);

    const sikinaModule: TestingModule = await Test.createTestingModule({
      providers: [SikinaService, { provide: ConfigService, useValue: config }],
    }).compile();
    sikina = sikinaModule.get(SikinaService);
  });

  it.each([
    ["awash", () => awash],
    ["sikina", () => sikina],
  ])("%s accepts a valid signature", (_name, getSvc) => {
    const rawBody = JSON.stringify({ eventType: "payment.successful" });
    const t = Math.floor(Date.now() / 1000);
    expect(getSvc().verifyWebhookSignature(rawBody, sign(secret, rawBody, t))).toBe(
      true,
    );
  });

  it.each([
    ["awash", () => awash],
    ["sikina", () => sikina],
  ])("%s rejects a bad HMAC", (_name, getSvc) => {
    const rawBody = JSON.stringify({ eventType: "payment.successful" });
    const t = Math.floor(Date.now() / 1000);
    expect(
      getSvc().verifyWebhookSignature(rawBody, `t=${t},v1=${"ab".repeat(32)}`),
    ).toBe(false);
  });

  it.each([
    ["awash", () => awash],
    ["sikina", () => sikina],
  ])("%s rejects a signature outside the clock skew window", (_name, getSvc) => {
    const rawBody = JSON.stringify({ eventType: "payment.successful" });
    const t = Math.floor(Date.now() / 1000) - 301;
    expect(getSvc().verifyWebhookSignature(rawBody, sign(secret, rawBody, t))).toBe(
      false,
    );
  });
});

describe("PaymentService webhook idempotency", () => {
  let service: PaymentService;
  let mockPaymentTransactionRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mockAuctionRepo: { findOne: jest.Mock; save: jest.Mock };
  let mockWinnerRepo: { count: jest.Mock };
  let markAsPaidSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockPaymentTransactionRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    mockAuctionRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    mockWinnerRepo = { count: jest.fn().mockResolvedValue(0) };

    const mockRepos: Record<string, any> = {
      paymentTransaction: mockPaymentTransactionRepo,
      auction: mockAuctionRepo,
      winner: mockWinnerRepo,
      bid: { find: jest.fn() },
    };

    const mockPrisma: any = {
      repository: jest.fn((model: string) => mockRepos[model]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: { set: jest.fn(), get: jest.fn() } },
        {
          provide: WinnerService,
          useValue: {
            updateWinnerPaymentStatus: jest.fn(),
            getNextUnpaidWinner: jest.fn(),
            calculateWinners: jest.fn(),
          },
        },
        {
          provide: BidEncryptionService,
          useValue: { decrypt: jest.fn() },
        },
        {
          provide: NotificationDispatchService,
          useValue: { dispatch: jest.fn() },
        },
        {
          provide: PaymentLinkService,
          useValue: {},
        },
        {
          provide: AwashService,
          useValue: {},
        },
        {
          provide: SikinaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
    markAsPaidSpy = jest
      .spyOn(service as any, "markAsPaid")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    markAsPaidSpy.mockRestore();
  });

  it("processes the first successful webhook and marks paid for WINNING_BID", async () => {
    mockPaymentTransactionRepo.update.mockResolvedValue({ count: 1 });
    mockPaymentTransactionRepo.findOne.mockResolvedValue({
      id: "txn-1",
      client_reference_id: "pay-1",
      auction_id: "auction-1",
      user_id: "user-1",
      payment_type: PaymentType.WINNING_BID,
      gateway: "SIKINA",
    });
    mockPaymentTransactionRepo.save.mockResolvedValue({});

    await service.handleSuccessfulPayment("pay-1", "gw-ref", { event: 1 });

    expect(markAsPaidSpy).toHaveBeenCalledWith("auction-1", "user-1");
    expect(mockPaymentTransactionRepo.save).toHaveBeenCalled();
  });

  it("skips side effects on a duplicate successful webhook", async () => {
    mockPaymentTransactionRepo.update.mockResolvedValue({ count: 0 });

    await service.handleSuccessfulPayment("pay-1", "gw-ref", { event: 1 });
    await service.handleSuccessfulPayment("pay-1", "gw-ref", { event: 2 });

    expect(mockPaymentTransactionRepo.update).toHaveBeenCalledTimes(2);
    expect(mockPaymentTransactionRepo.findOne).not.toHaveBeenCalled();
    expect(markAsPaidSpy).not.toHaveBeenCalled();
  });

  it("does not mark auction paid for BID_FEE webhooks", async () => {
    mockPaymentTransactionRepo.update.mockResolvedValue({ count: 1 });
    mockPaymentTransactionRepo.findOne.mockResolvedValue({
      id: "txn-2",
      client_reference_id: "fee-1",
      auction_id: "auction-1",
      user_id: "user-1",
      payment_type: PaymentType.BID_FEE,
      gateway: "AWASH",
    });
    mockPaymentTransactionRepo.save.mockResolvedValue({});

    await service.handleSuccessfulPayment("fee-1", "awash-ref", {});

    expect(markAsPaidSpy).not.toHaveBeenCalled();
  });
});
