import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BiddingController } from "../src/modules/bidding/bidding.controller";
import { BiddingService } from "../src/modules/bidding/bidding.service";
import { WinnerService } from "../src/modules/winner/winner.service";
import { BidEncryptionService } from "../src/modules/common/bid-encryption.service";
import { Auction } from "../src/modules/winner/entities/auction.entity";
import { Bid } from "../src/modules/bidding/entities/bid.entity";
import { Winner } from "../src/modules/winner/entities/winner.entity";
import { REDIS_CLIENT } from "../src/modules/common/redis.decorator";
import { NotificationDispatchService } from "../src/modules/worker/notification-dispatch.service";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    save: jest.fn((x: any) => x),
  };
}

describe("BiddingController - getMyBids", () => {
  let controller: BiddingController;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockBidEncryption: { decrypt: jest.Mock };

  beforeEach(async () => {
    mockBidRepo = createMockRepo();
    mockBidEncryption = { decrypt: jest.fn().mockReturnValue("30.50") };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BiddingController],
      providers: [
        { provide: BiddingService, useValue: {} },
        { provide: WinnerService, useValue: {} },
        { provide: BidEncryptionService, useValue: mockBidEncryption },
        { provide: REDIS_CLIENT, useValue: {} },
        {
          provide: NotificationDispatchService,
          useValue: { dispatch: jest.fn() },
        },
        { provide: getRepositoryToken(Auction), useValue: createMockRepo() },
        { provide: getRepositoryToken(Bid), useValue: mockBidRepo },
        { provide: getRepositoryToken(Winner), useValue: createMockRepo() },
      ],
    }).compile();
    controller = module.get<BiddingController>(BiddingController);
  });

  it("returns only the current user bids for the auction, decrypting encrypted amounts", async () => {
    mockBidRepo.find.mockResolvedValue([
      {
        amount: 50.01,
        encrypted_amount: "",
        bid_time: new Date("2026-01-01"),
        ticket_number: "BID_1",
      },
      {
        amount: 0,
        encrypted_amount: "enc",
        bid_time: new Date("2026-01-02"),
        ticket_number: "BID_2",
      },
    ]);

    const result = await controller.getMyBids("auc-1", {
      user: { id: "user-1" },
    });

    expect(mockBidRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { auction_id: "auc-1", user_id: "user-1" },
      }),
    );
    expect(mockBidEncryption.decrypt).toHaveBeenCalledWith("enc");
    expect(result).toEqual({
      auction_id: "auc-1",
      bids: [
        { amount: 50.01, bid_time: expect.any(Date), ticket_number: "BID_1" },
        { amount: 30.5, bid_time: expect.any(Date), ticket_number: "BID_2" },
      ],
    });
  });
});
