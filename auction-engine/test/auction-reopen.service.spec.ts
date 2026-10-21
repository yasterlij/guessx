import { AuctionAdminService } from "../src/modules/admin/auction-admin.service";
import { AuctionStatus } from "@prisma/client";
import { PrismaService } from "../src/prisma/prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((e) => Promise.resolve(e)),
    count: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
    findAndCount: jest.fn(),
  };
}

describe("AuctionAdminService.reopenAuction", () => {
  let service: AuctionAdminService;
  let mockAuctionRepo: ReturnType<typeof createMockRepo>;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockWinnerRepo: ReturnType<typeof createMockRepo>;
  let mockProductRepo: ReturnType<typeof createMockRepo>;
  let mockAuditRepo: ReturnType<typeof createMockRepo>;
  let mockClosureService: any;
  let mockWinnerService: { cleanupAuctionKeys: jest.Mock };

  beforeEach(() => {
    mockAuctionRepo = createMockRepo();
    mockBidRepo = createMockRepo();
    mockWinnerRepo = createMockRepo();
    mockProductRepo = createMockRepo();
    mockAuditRepo = createMockRepo();
    mockClosureService = {};
    mockWinnerService = { cleanupAuctionKeys: jest.fn().mockResolvedValue(undefined) };

    const mockRepos: Record<string, any> = {
      auction: mockAuctionRepo,
      bid: mockBidRepo,
      winner: mockWinnerRepo,
      product: mockProductRepo,
      auditLog: mockAuditRepo,
    };

    const mockPrisma: any = {
      repository: jest.fn((model: string) => mockRepos[model]),
    };

    service = new AuctionAdminService(
      mockPrisma as unknown as PrismaService,
      mockClosureService,
      mockWinnerService as any,
    );
  });

  it("throws NotFoundException if auction does not exist", async () => {
    mockAuctionRepo.findOne.mockResolvedValue(null);

    await expect(
      service.reopenAuction("nonexistent-id", {
        start_time: "2026-09-15T00:00:00Z",
        end_time: "2026-09-22T00:00:00Z",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException if auction is currently active", async () => {
    mockAuctionRepo.findOne.mockResolvedValue({
      id: "auc-active",
      status: AuctionStatus.ACTIVE,
      end_time: new Date(Date.now() + 1000000),
    });

    await expect(
      service.reopenAuction("auc-active", {
        start_time: "2026-09-15T00:00:00Z",
        end_time: "2026-09-22T00:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException if auction closed with a confirmed winning bidder", async () => {
    mockAuctionRepo.findOne.mockResolvedValue({
      id: "auc-won",
      status: AuctionStatus.CLOSED,
      winner_user_id: "user-123",
      end_time: new Date("2026-09-01T00:00:00Z"),
    });

    await expect(
      service.reopenAuction("auc-won", {
        start_time: "2026-09-15T00:00:00Z",
        end_time: "2026-09-22T00:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException if end_time is before or equal to start_time", async () => {
    mockAuctionRepo.findOne.mockResolvedValue({
      id: "auc-unsold",
      status: AuctionStatus.EXPIRED,
      winner_user_id: null,
      end_time: new Date("2026-09-01T00:00:00Z"),
    });
    mockWinnerRepo.find.mockResolvedValue([]);

    await expect(
      service.reopenAuction("auc-unsold", {
        start_time: "2026-09-20T00:00:00Z",
        end_time: "2026-09-19T00:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException if start_time is not a valid date", async () => {
    mockAuctionRepo.findOne.mockResolvedValue({
      id: "auc-unsold",
      status: AuctionStatus.EXPIRED,
      winner_user_id: null,
      end_time: new Date("2026-09-01T00:00:00Z"),
    });

    await expect(
      service.reopenAuction("auc-unsold", {
        start_time: "not-a-date",
        end_time: "2026-09-22T00:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("applies provided product fields when reopening", async () => {
    mockAuctionRepo.findOne.mockResolvedValue({
      id: "auc-unsold",
      product_id: "prod-1",
      status: AuctionStatus.EXPIRED,
      winner_user_id: null,
      start_time: new Date("2026-09-01T00:00:00Z"),
      end_time: new Date("2026-09-08T00:00:00Z"),
    });
    const existingProduct = {
      id: "prod-1",
      name: "Old Name",
      description: "Old description",
      category: "Electronics",
      image_urls: ["https://example.com/old.jpg"],
      current_market_price: 1000,
    };
    mockProductRepo.findOne.mockResolvedValue(existingProduct);

    await service.reopenAuction(
      "auc-unsold",
      {
        start_time: "2026-09-15T00:00:00Z",
        end_time: "2026-09-22T00:00:00Z",
        name: "New Name",
        description: "New description",
        current_market_price: 2000,
        image_urls: ["https://example.com/new.jpg"],
      },
      "admin-user-1",
    );

    expect(mockProductRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "prod-1",
        name: "New Name",
        description: "New description",
        current_market_price: 2000,
        image_urls: ["https://example.com/new.jpg"],
      }),
    );
  });

  it("successfully reopens an unsold auction and cleans prior bids and Redis state", async () => {
    const existingAuction = {
      id: "auc-unsold",
      product_id: "prod-1",
      status: AuctionStatus.CLOSED,
      winner_user_id: null,
      winning_bid_amount: 15,
      payment_status: "EXPIRED",
      payment_deadline: new Date(),
      extensions: 2,
      start_time: new Date("2026-09-01T00:00:00Z"),
      end_time: new Date("2026-09-08T00:00:00Z"),
      product: { id: "prod-1", name: "iPhone 15", current_market_price: 50000 },
    };

    mockAuctionRepo.findOne.mockResolvedValue(existingAuction);
    mockWinnerRepo.find.mockResolvedValue([]);
    mockBidRepo.count.mockResolvedValue(4);

    const newStart = "2026-09-15T10:00:00.000Z";
    const newEnd = "2026-09-22T10:00:00.000Z";

    const result = await service.reopenAuction("auc-unsold", {
      start_time: newStart,
      end_time: newEnd,
      min_bid: 10,
      bid_fee: 5,
    }, "admin-user-1");

    expect(mockWinnerRepo.delete).toHaveBeenCalledWith({ auction_id: "auc-unsold" });
    expect(mockBidRepo.delete).toHaveBeenCalledWith({ auction_id: "auc-unsold" });
    expect(mockWinnerService.cleanupAuctionKeys).toHaveBeenCalledWith("auc-unsold");

    expect(result.status).toBe(AuctionStatus.ACTIVE);
    expect(result.start_time).toEqual(new Date(newStart));
    expect(result.end_time).toEqual(new Date(newEnd));
    expect(result.winner_user_id).toBeNull();
    expect(result.winning_bid_amount).toBeNull();
    expect(result.payment_status).toBeNull();
    expect(result.extensions).toBe(0);
    expect(result.stats).toEqual({ total_bids: 0, unique_bidders: 0 });

    expect(mockAuditRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "admin-user-1",
        action: "AUCTION_REOPENED",
        entity_id: "auc-unsold",
      }),
    );
  });

  describe("bulkReopenAuctions", () => {
    it("throws BadRequestException if auction_ids is empty", async () => {
      await expect(
        service.bulkReopenAuctions({ auction_ids: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException if end_time is not after start_time", async () => {
      await expect(
        service.bulkReopenAuctions({
          auction_ids: ["auc-1"],
          start_time: "2026-09-20T00:00:00Z",
          end_time: "2026-09-19T00:00:00Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException if more than 100 auction_ids are provided", async () => {
      await expect(
        service.bulkReopenAuctions({
          auction_ids: Array.from({ length: 101 }, (_, i) => `auc-${i}`),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("deduplicates auction_ids and reports unique totals", async () => {
      mockAuctionRepo.findOne.mockImplementation((opts: any) =>
        Promise.resolve({
          id: opts.where.id,
          status: AuctionStatus.EXPIRED,
          start_time: new Date("2026-09-01T00:00:00Z"),
          end_time: new Date("2026-09-08T00:00:00Z"),
          winner_user_id: null,
          product: { id: `prod-${opts.where.id}`, name: "Product" },
        }),
      );
      mockWinnerRepo.find.mockResolvedValue([]);
      mockBidRepo.count.mockResolvedValue(0);

      const result = await service.bulkReopenAuctions({
        auction_ids: ["auc-1", "auc-1"],
        duration_days: 7,
      });

      expect(result.total).toBe(1);
      expect(result.reopened).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("reopens multiple auctions and returns summarized report", async () => {
      mockAuctionRepo.findOne.mockImplementation((opts: any) =>
        Promise.resolve({
          id: opts.where.id,
          status: AuctionStatus.EXPIRED,
          start_time: new Date("2026-09-01T00:00:00Z"),
          end_time: new Date("2026-09-08T00:00:00Z"),
          winner_user_id: null,
          product: { id: `prod-${opts.where.id}`, name: "Product" },
        }),
      );
      mockAuctionRepo.query.mockResolvedValue([
        { id: "auc", status: AuctionStatus.ACTIVE },
      ]);
      mockWinnerRepo.find.mockResolvedValue([]);
      mockBidRepo.count.mockResolvedValue(0);

      const result = await service.bulkReopenAuctions({
        auction_ids: ["auc-1", "auc-2"],
        duration_days: 7,
      }, "admin-1");

      expect(result.total).toBe(2);
      expect(result.reopened).toBe(2);
      expect(result.failed).toBe(0);
    });
  });
});
