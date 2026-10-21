import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { BiddingService } from "../src/modules/bidding/bidding.service";
import { PrismaService } from "../src/prisma/prisma.service";
import { REDIS_CLIENT } from "../src/modules/common/redis.decorator";
import { AuctionClosureService } from "../src/modules/winner/auction-closure.service";
import { AuctionGateway } from "../src/modules/bidding/gateway/auction.gateway";
import { BidEncryptionService } from "../src/modules/common/bid-encryption.service";
import { NotificationDispatchService } from "../src/modules/worker/notification-dispatch.service";

describe("BiddingService trackBidInRedis", () => {
  let service: BiddingService;
  let redis: { eval: jest.Mock };

  beforeEach(async () => {
    redis = {
      eval: jest.fn().mockResolvedValue(1),
    };

    const mockRepos: Record<string, any> = {
      auction: { findOne: jest.fn(), save: jest.fn(), count: jest.fn() },
      bid: { count: jest.fn().mockResolvedValue(0), create: jest.fn(), find: jest.fn() },
      paymentTransaction: { findOne: jest.fn() },
    };

    const mockPrisma: any = {
      repository: jest.fn((model: string) => mockRepos[model]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiddingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: AuctionClosureService, useValue: {} },
        { provide: AuctionGateway, useValue: { emitBidUpdate: jest.fn() } },
        { provide: getQueueToken("incoming-bids"), useValue: { add: jest.fn() } },
        {
          provide: BidEncryptionService,
          useValue: { encrypt: jest.fn().mockReturnValue("enc") },
        },
        {
          provide: NotificationDispatchService,
          useValue: { dispatch: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BiddingService);
  });

  it("updates frequency and uniqueness in a single Redis EVAL", async () => {
    const endTime = new Date(Date.now() + 60_000);
    await (service as any).trackBidInRedis(
      "auction-1",
      "user-1",
      12.5,
      endTime,
    );

    expect(redis.eval).toHaveBeenCalledTimes(1);
    const [script, numKeys, ...args] = redis.eval.mock.calls[0];
    expect(typeof script).toBe("string");
    expect(script).toContain("ZINCRBY");
    expect(script).toContain("ZADD");
    expect(script).toContain("ZREM");
    expect(numKeys).toBe(4);
    expect(args[0]).toBe("guessx:auction:auction-1:frequencies");
    expect(args[1]).toBe("guessx:auction:auction-1:unique_bids");
    expect(args[2]).toBe("guessx:auction:auction-1:bidders");
    expect(args[3]).toBe("guessx:auction:auction-1:total_bids");
    expect(args[4]).toBe("12.50");
    expect(args[5]).toBe("12.5");
    expect(args[6]).toBe("user-1");
    expect(Number(args[7])).toBeGreaterThan(0);
  });

  it("Lua script adds unique on first occurrence and removes on duplicates", () => {
    const script: string = (BiddingService as any).TRACK_BID_LUA;
    expect(script).toMatch(/if count == 1 then/);
    expect(script).toMatch(/ZADD[\s\S]*else[\s\S]*ZREM/);
    expect(script.indexOf("ZINCRBY")).toBeLessThan(script.indexOf("ZADD"));
  });
});
