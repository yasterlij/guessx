import { AuctionReviewService } from '../src/modules/admin/auction-review.service';
import { AuctionStatus } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    query: jest.fn(),
  };
}

describe('AuctionReviewService', () => {
  let service: AuctionReviewService;
  let mockAuctionRepo: ReturnType<typeof createMockRepo>;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockWinnerService: {
    calculateWinners: jest.Mock;
    getUniqueBiddersCount: jest.Mock;
    getAuctionWinners: jest.Mock;
  };
  let mockBidEncryption: { decrypt: jest.Mock };

  beforeEach(() => {
    mockAuctionRepo = createMockRepo();
    mockBidRepo = createMockRepo();
    mockWinnerService = {
      calculateWinners: jest.fn(),
      getUniqueBiddersCount: jest.fn(),
      getAuctionWinners: jest.fn(),
    };
    mockBidEncryption = { decrypt: jest.fn() };

    const mockRepos: Record<string, any> = {
      auction: mockAuctionRepo,
      bid: mockBidRepo,
      winner: createMockRepo(),
    };

    const mockPrisma: any = {
      repository: jest.fn((model: string) => mockRepos[model]),
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
    };

    service = new AuctionReviewService(
      mockPrisma as unknown as PrismaService,
      mockWinnerService as any,
      mockBidEncryption as any,
    );
  });

  it('falls back to base bid columns when legacy schemas are missing encrypted bid fields during winner draw', async () => {
    const auction = {
      id: 'auc-1',
      status: AuctionStatus.CLOSED,
      product: null,
      start_time: new Date('2026-01-01T00:00:00Z'),
      end_time: new Date('2026-01-02T00:00:00Z'),
      winner_user_id: null,
      winning_bid_amount: null,
      created_at: new Date('2026-01-03T00:00:00Z'),
      payment_status: null,
      payment_deadline: null,
    };

    mockAuctionRepo.findOne.mockResolvedValue(auction);
    mockBidRepo.find.mockRejectedValue(
      new Error('column bids.encrypted_amount does not exist'),
    );
    mockBidRepo.query.mockResolvedValue([
      {
        bid_id: 'bid-1',
        bid_user_id: 'user-1',
        bid_auction_id: 'auc-1',
        bid_amount: 12,
        bid_bid_time: new Date('2026-01-01T00:00:00Z'),
        bid_service_fee_paid: true,
      },
    ]);
    mockWinnerService.calculateWinners.mockResolvedValue({
      winningAmounts: [12],
      totalBids: 1,
      winners: [{ amount: 12, userId: 'user-1' }],
    });
    mockWinnerService.getUniqueBiddersCount.mockResolvedValue(1);
    mockWinnerService.getAuctionWinners.mockResolvedValue([]);

    const result = await service.drawWinner('auc-1');

    expect(mockBidRepo.query).toHaveBeenCalled();
    expect(result.total_bids).toBe(1);
    expect(result.bids).toEqual([
      expect.objectContaining({
        id: 'bid-1',
        user_id: 'user-1',
        auction_id: 'auc-1',
        amount: 12,
        service_fee_paid: true,
        ticket_number: '',
      }),
    ]);
  });
});
