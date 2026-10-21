import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuctionStatus } from "@prisma/client";
import { WinnerService } from "../winner/winner.service";
import { BidEncryptionService } from "../common/bid-encryption.service";

@Injectable()
export class AuctionReviewService {
  private readonly logger = new Logger(AuctionReviewService.name);

  private isLegacyBidSchemaError(error: unknown): boolean {
    const message =
      error instanceof Error
        ? (error instanceof Error ? error.message : String(error)).toLowerCase()
        : String(error).toLowerCase();

    const isSchemaError =
      message.includes("does not exist") ||
      message.includes("unknown column") ||
      message.includes("no such column");

    return (
      isSchemaError &&
      (message.includes("encrypted_amount") ||
        message.includes("ticket_number"))
    );
  }

  private normalizeBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "t";
    }
    return value != null;
  }

  private mapLegacyBidRow(row: Record<string, unknown>): any {
    return {
      id: String(row.bid_id ?? ""),
      user_id: String(row.bid_user_id ?? ""),
      auction_id: String(row.bid_auction_id ?? ""),
      amount: Number(row.bid_amount ?? 0),
      bid_time: row.bid_bid_time as Date,
      service_fee_paid: this.normalizeBoolean(row.bid_service_fee_paid),
      ticket_number: "",
      encrypted_amount: "",
    } as any;
  }

  private async loadAuctionBids(auctionId: string): Promise<any[]> {
    try {
      return await this.prisma.repository("bid").find({
        where: { auction_id: auctionId },
        order: { bid_time: "ASC" },
      });
    } catch (e) {
      if (!this.isLegacyBidSchemaError(e)) {
        throw e;
      }

      this.logger.warn(
        `Legacy bid schema detected for ${auctionId}, falling back to base bid columns: ${e instanceof Error ? e.message : String(e)}`,
      );

      const rows = await this.prisma.repository("bid").query(
        `SELECT id AS bid_id, user_id AS bid_user_id, auction_id AS bid_auction_id,
                  amount AS bid_amount, bid_time AS bid_bid_time, service_fee_paid AS bid_service_fee_paid
           FROM bids WHERE auction_id = $1 ORDER BY bid_time ASC`,
        [auctionId],
      );

      return rows.map((row: any) => this.mapLegacyBidRow(row));
    }
  }

  constructor(
    private prisma: PrismaService,
    private winnerService: WinnerService,
    private bidEncryptionService: BidEncryptionService,
  ) {}

  private async resolveWinnerUserInfo(
    userId: string | null,
  ): Promise<{ name: string | null; phone: string | null } | null> {
    if (!userId) return null;
    try {
      const identityBase =
        process.env.IDENTITY_SERVICE_URL || "http://localhost:3001";
      const headers: Record<string, string> = {};
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      const res = await fetch(
        `${identityBase}/api/v1/wallet/user/${userId}/internal`,
        { headers },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return {
        name: data.full_name || data.phone_number || null,
        phone: data.phone_number || null,
      };
    } catch (e: unknown) {
      this.logger.warn(
        `Failed to resolve winner info for ${userId}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  private resolveBidAmount(bid: any): number {
    if (bid.amount !== 0 || !bid.encrypted_amount) return bid.amount;
    try {
      return this.bidEncryptionService.decrypt(bid.encrypted_amount);
    } catch {
      return 0;
    }
  }

  async drawWinner(auctionId: string) {
    const auction = await this.prisma.repository("auction").findOne({
      where: { id: auctionId },
      include: { product: true },
    });
    if (!auction) throw new NotFoundException("Auction not found");

    let bids: any[] = [];
    if (auction.status === AuctionStatus.CLOSED) {
      bids = await this.loadAuctionBids(auctionId);
    }

    const { winningAmounts, totalBids, winners } =
      await this.winnerService.calculateWinners(auctionId);
    const uniqueBidders =
      await this.winnerService.getUniqueBiddersCount(auctionId);
    const stats = {
      totalBids,
      uniqueBidders,
      lowestUniqueBid: winningAmounts.length > 0 ? winningAmounts[0] : null,
    };
    const primaryWinnerInfo = await this.resolveWinnerUserInfo(
      auction.winner_user_id,
    );
    const winnerName = primaryWinnerInfo?.name || null;
    const winnerPhone = primaryWinnerInfo?.phone || null;

    const persistedWinners =
      await this.winnerService.getAuctionWinners(auctionId);

    const allWinners = await Promise.all(
      (persistedWinners.length > 0 ? persistedWinners : winners).map(
        async (w: any) => {
          const info = await this.resolveWinnerUserInfo(w.user_id || w.userId);
          return {
            user_id: w.user_id || w.userId,
            amount: w.amount,
            rank: w.rank,
            payment_status: w.payment_status,
            payment_deadline: w.payment_deadline,
            name: info?.name || null,
            phone: info?.phone || null,
          };
        },
      ),
    );

    return {
      id: auction.id,
      product: auction.product,
      status: auction.status,
      start_time: auction.start_time,
      end_time: auction.end_time,
      winner_user_id: auction.winner_user_id,
      winner_name: winnerName,
      winner_phone: winnerPhone,
      winning_bid_amount:
        auction.winning_bid_amount ??
        (winners.length > 0 ? winners[0].amount : null),
      total_bids: stats.totalBids,
      unique_bidders: stats.uniqueBidders,
      lowest_unique_bid: stats.lowestUniqueBid,
      all_winners: allWinners,
      winners_count: allWinners.length,
      bids: bids.map((b) => ({ ...b, amount: this.resolveBidAmount(b) })),
      created_at: auction.created_at,
      payment_status: auction.payment_status,
      payment_deadline: auction.payment_deadline,
    };
  }

  async getAuctionBids(auctionId: string) {
    const auction = await this.prisma.repository("auction").findOne({
      where: { id: auctionId },
      select: { id: true, status: true },
    });
    if (!auction) throw new NotFoundException("Auction not found");
    const bids = await this.loadAuctionBids(auctionId);
    const isActive = auction.status === AuctionStatus.ACTIVE;
    const enriched = await Promise.all(
      bids.map(async (b) => {
        const info = await this.resolveWinnerUserInfo(b.user_id);
        let realAmount = b.amount;
        if (!isActive && b.encrypted_amount) {
          try {
            realAmount = this.bidEncryptionService.decrypt(b.encrypted_amount);
          } catch {
            realAmount = 0;
          }
        }
        return {
          id: b.id,
          user_id: b.user_id,
          user_name: info?.name || null,
          auction_id: b.auction_id,
          amount: isActive ? 0 : realAmount,
          encrypted_amount: isActive ? b.encrypted_amount : null,
          amount_encrypted: isActive,
          bid_time: b.bid_time,
          service_fee_paid: b.service_fee_paid,
          ticket_number: b.ticket_number,
        };
      }),
    );
    return enriched;
  }
}
