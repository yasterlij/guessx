import { Injectable, Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRedis } from "../common/redis.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { MIN_VALID_BID_AMOUNT } from "../../config/constants";

export interface WinnerRecord {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  rank: number;
  payment_status: string;
  payment_deadline: Date | string | null;
  notified_at?: Date | string | null;
  created_at?: Date | string | null;
}

@Injectable()
export class WinnerService {
  private readonly logger = new Logger(WinnerService.name);

  private isWinnerPersistenceSchemaError(error: unknown): boolean {
    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

    return (
      message.includes("winners") &&
      (message.includes("does not exist") ||
        message.includes("unknown column") ||
        message.includes("no such table"))
    );
  }

  private normalizeAmount(amount: string | number): string {
    return Number(amount).toFixed(2);
  }

  private isValidBidAmount(amount: number | string): boolean {
    return Number(amount) >= MIN_VALID_BID_AMOUNT;
  }

  private readBidAmount(
    bid: Pick<any, "amount" | "encrypted_amount">,
  ): string | null {
    if (Number(bid.amount) !== 0 || !bid.encrypted_amount) {
      return this.normalizeAmount(bid.amount);
    }

    try {
      return this.normalizeAmount(
        this.bidEncryptionService.decrypt(bid.encrypted_amount),
      );
    } catch (e) {
      this.logger.warn(
        `Failed to decrypt bid amount (encrypted_amount present): ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly bidEncryptionService: BidEncryptionService,
  ) {}

  async calculateWinners(auctionId: string): Promise<{
    winningAmounts: number[];
    totalBids: number;
    winners: { amount: number; userId: string }[];
  }> {
    const auction = await this.prisma.repository("auction").findOne({
      where: { id: auctionId },
      select: { status: true },
    });

    if (auction?.status === "CLOSED" || auction?.status === "EXPIRED") {
      try {
        return await this.getPersistedWinners(auctionId);
      } catch (e) {
        if (!this.isWinnerPersistenceSchemaError(e)) {
          throw e;
        }

        this.logger.warn(
          `Persisted winners unavailable for ${auctionId}, falling back to bids: ${e.message}`,
        );
        return this.calculateWinnersFromDb(auctionId, 1);
      }
    }

    const dbResult = await this.calculateWinnersFromDb(auctionId, 1);

    if (dbResult.totalBids > 0) {
      return dbResult;
    }

    try {
      const result = await this.calculateWinnersFromRedis(auctionId, 1);
      if (result.found) {
        return result;
      }
    } catch (e) {
      this.logger.warn(
        `Redis winner calc failed for ${auctionId}: ${e.message}`,
      );
    }

    return dbResult;
  }

  async hasUniqueBids(auctionId: string): Promise<boolean> {
    try {
      return await this.hasUniqueBidsFromDb(auctionId);
    } catch (e) {
      this.logger.warn(`DB unique check failed for ${auctionId}: ${e.message}`);
    }

    try {
      const result = await this.hasUniqueBidsFromRedis(auctionId);
      if (result !== null) return result;
    } catch (e) {
      this.logger.warn(
        `Redis unique check failed for ${auctionId}: ${e.message}`,
      );
    }

    return false;
  }

  private async hasUniqueBidsFromRedis(
    auctionId: string,
  ): Promise<boolean | null> {
    const totalBidsStr = await this.redis.get(
      `guessx:auction:${auctionId}:total_bids`,
    );
    if (totalBidsStr === null) return null;

    const totalBids = parseInt(totalBidsStr, 10);
    if (totalBids === 0) return false;

    const uniqueKey = `guessx:auction:${auctionId}:unique_bids`;
    const count = await this.redis.zcard(uniqueKey);
    if (count === 0) return false;

    const amounts = await this.redis.zrange(uniqueKey, 0, -1);
    const freqKey = `guessx:auction:${auctionId}:frequencies`;

    const scores = await Promise.all(
      amounts.map((amount) =>
        this.redis.zscore(freqKey, this.normalizeAmount(amount)),
      ),
    );

    return scores.some((freq) => freq !== null && Number(freq) === 1);
  }

  private async hasUniqueBidsFromDb(auctionId: string): Promise<boolean> {
    const bids = await this.prisma.repository("bid").find({
      where: { auction_id: auctionId },
      select: { amount: true, encrypted_amount: true },
    });

    if (bids.length === 0) return false;

    const frequency = new Map<string, number>();
    for (const bid of bids) {
      const realAmount = this.readBidAmount(bid);
      if (realAmount === null || !this.isValidBidAmount(realAmount)) continue;
      frequency.set(realAmount, (frequency.get(realAmount) || 0) + 1);
    }

    for (const count of frequency.values()) {
      if (count === 1) return true;
    }

    return false;
  }

  async getPersistedWinners(auctionId: string): Promise<{
    winningAmounts: number[];
    totalBids: number;
    winners: { amount: number; userId: string }[];
  }> {
    const totalBids = await this.prisma.repository("bid").count({
      where: { auction_id: auctionId },
    });

    const persistedWinners = await this.prisma.repository("winner").find({
      where: { auction_id: auctionId },
      order: { rank: "asc" },
    });

    return {
      winningAmounts: persistedWinners.map((w) => w.amount),
      totalBids,
      winners: persistedWinners.map((w) => ({
        amount: w.amount,
        userId: w.user_id,
      })),
    };
  }

  async persistWinners(
    auctionId: string,
    winners: { amount: number; userId: string }[],
    paymentDeadline: Date,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager?: any,
  ): Promise<WinnerRecord[]> {
    const repo = manager
      ? manager.repository("winner")
      : this.prisma.repository("winner");
    const existing = await repo.find({
      where: { auction_id: auctionId },
    });
    if (existing.length > 0) {
      this.logger.warn(
        `Winners already exist for auction ${auctionId}, skipping persist`,
      );
      return existing;
    }

    const entities = winners.map((w, i) =>
      repo.create({
        auction_id: auctionId,
        user_id: w.userId,
        amount: w.amount,
        rank: i + 1,
        payment_status: "PENDING",
        payment_deadline: paymentDeadline,
      }),
    );

    return repo.save(entities);
  }

  private async calculateWinnersFromRedis(
    auctionId: string,
    numWinners: number,
  ): Promise<{
    found: boolean;
    winningAmounts: number[];
    totalBids: number;
    winners: { amount: number; userId: string }[];
  }> {
    const totalBidsStr = await this.redis.get(
      `guessx:auction:${auctionId}:total_bids`,
    );
    if (totalBidsStr === null) {
      return { found: false, winningAmounts: [], totalBids: 0, winners: [] };
    }

    const totalBids = parseInt(totalBidsStr, 10);
    if (totalBids === 0) {
      return { found: true, winningAmounts: [], totalBids: 0, winners: [] };
    }

    const uniqueKey = `guessx:auction:${auctionId}:unique_bids`;
    const amounts = await this.redis.zrange(uniqueKey, 0, numWinners - 1);
    if (amounts.length === 0) {
      return { found: true, winningAmounts: [], totalBids, winners: [] };
    }

    const winningAmounts = amounts
      .map((a) => Number(this.normalizeAmount(a)))
      .filter((a) => this.isValidBidAmount(a));
    const freqKey = `guessx:auction:${auctionId}:frequencies`;

    const freqResults = await Promise.all(
      winningAmounts.map((a) =>
        this.redis.zscore(freqKey, this.normalizeAmount(a)),
      ),
    );

    const uniqueAmounts = winningAmounts.filter(
      (_, i) => freqResults[i] && Number(freqResults[i]) === 1,
    );

    const earliestMap = await this.findEarliestBidders(
      auctionId,
      uniqueAmounts,
    );
    const winners: { amount: number; userId: string }[] = [];
    for (const amount of uniqueAmounts) {
      const userId = earliestMap.get(amount);
      if (userId) {
        winners.push({ amount, userId });
      }
    }

    return { found: true, winningAmounts, totalBids, winners };
  }

  private async calculateWinnersFromDb(
    auctionId: string,
    numWinners: number,
  ): Promise<{
    winningAmounts: number[];
    totalBids: number;
    winners: { amount: number; userId: string }[];
  }> {
    const bids = await this.prisma.repository("bid").find({
      where: { auction_id: auctionId },
      order: { bid_time: "asc" },
    });

    const totalBids = bids.length;
    if (totalBids === 0) {
      return { winningAmounts: [], totalBids: 0, winners: [] };
    }

    const frequency = new Map<string, number>();
    const earliestPerAmount = new Map<string, string>();
    for (const bid of bids) {
      const realAmount = this.readBidAmount(bid);
      if (realAmount === null || !this.isValidBidAmount(realAmount)) continue;
      frequency.set(realAmount, (frequency.get(realAmount) || 0) + 1);
      if (!earliestPerAmount.has(realAmount)) {
        earliestPerAmount.set(realAmount, bid.user_id);
      }
    }

    const uniqueAmounts = Array.from(frequency.entries())
      .filter(([, count]) => count === 1)
      .map(([amount]) => amount)
      .sort((a, b) => Number(a) - Number(b));

    const selected = uniqueAmounts.slice(0, numWinners);
    const winners = selected.map((amount) => ({
      amount: Number(amount),
      userId: earliestPerAmount.get(amount) || "",
    }));

    return {
      winningAmounts: selected.map((amount) => Number(amount)),
      totalBids,
      winners,
    };
  }

  private async findEarliestBidder(
    auctionId: string,
    amount: number,
  ): Promise<string | null> {
    const bids = await this.prisma.repository("bid").find({
      where: { auction_id: auctionId },
      order: { bid_time: "asc" },
      select: { user_id: true, amount: true, encrypted_amount: true },
    });
    const targetAmount = this.normalizeAmount(amount);
    const match = bids.find((b) => {
      if (Number(b.amount) !== 0 || !b.encrypted_amount)
        return this.normalizeAmount(b.amount) === targetAmount;
      try {
        return (
          this.normalizeAmount(
            this.bidEncryptionService.decrypt(b.encrypted_amount),
          ) === targetAmount
        );
      } catch {
        return false;
      }
    });
    return match?.user_id || null;
  }

  private async findEarliestBidders(
    auctionId: string,
    amounts: number[],
  ): Promise<Map<number, string>> {
    if (amounts.length === 0) return new Map();
    const amountSet = new Set(
      amounts.map((amount) => this.normalizeAmount(amount)),
    );
    const bids = await this.prisma.repository("bid").find({
      where: { auction_id: auctionId },
      order: { bid_time: "asc" },
    });
    const result = new Map<number, string>();
    const seen = new Set<string>();
    for (const bid of bids) {
      const realAmount = this.readBidAmount(bid);
      if (realAmount === null) continue;
      if (amountSet.has(realAmount) && !seen.has(realAmount)) {
        seen.add(realAmount);
        result.set(Number(realAmount), bid.user_id);
      }
    }
    return result;
  }

  async getUniqueBiddersCount(auctionId: string): Promise<number> {
    try {
      const key = `guessx:auction:${auctionId}:bidders`;
      const count = await this.redis.scard(key);
      if (count > 0) return count;
    } catch (e) {
      this.logger.warn(`Redis scard failed for ${auctionId}: ${e.message}`);
    }

    try {
      const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(DISTINCT user_id)::int AS count FROM bids WHERE auction_id = $1`,
        auctionId,
      );
      return parseInt(result[0]?.count?.toString() || "0", 10);
    } catch (e) {
      this.logger.error(`DB count query failed for ${auctionId}: ${e.message}`);
      return 0;
    }
  }

  async getAuctionStats(auctionId: string): Promise<{
    totalBids: number;
    uniqueBidders: number;
    lowestUniqueBid: number | null;
  }> {
    const { winningAmounts, totalBids } =
      await this.calculateWinners(auctionId);
    const uniqueBidders = await this.getUniqueBiddersCount(auctionId);
    return {
      totalBids,
      uniqueBidders,
      lowestUniqueBid: winningAmounts.length > 0 ? winningAmounts[0] : null,
    };
  }

  async cleanupAuctionKeys(auctionId: string): Promise<void> {
    const keys = [
      `guessx:auction:${auctionId}:frequencies`,
      `guessx:auction:${auctionId}:unique_bids`,
      `guessx:auction:${auctionId}:total_bids`,
      `guessx:auction:${auctionId}:bidders`,
      `guessx:auction:${auctionId}:lock`,
      "auctions:closed",
      "auctions:active",
    ];

    await this.redis.del(...keys);
    try {
      const cacheKeys = await this.redis.keys("cache:GET:*");
      if (cacheKeys.length > 0) {
        await this.redis.del(...cacheKeys);
      }
    } catch {
      // ignore
    }
    this.logger.debug(`Cleaned up Redis keys for auction ${auctionId}`);
  }

  async updateWinnerPaymentStatus(
    auctionId: string,
    userId: string,
    status: string,
  ): Promise<void> {
    await this.prisma
      .repository("winner")
      .update(
        { auction_id: auctionId, user_id: userId },
        { payment_status: status },
      );
  }

  async getAuctionWinners(auctionId: string): Promise<WinnerRecord[]> {
    try {
      return (await this.prisma.repository("winner").find({
        where: { auction_id: auctionId },
        order: { rank: "asc" },
      })) as WinnerRecord[];
    } catch (e) {
      if (!this.isWinnerPersistenceSchemaError(e)) {
        throw e;
      }

      this.logger.warn(
        `Winner records unavailable for ${auctionId}, returning calculated winners only: ${e.message}`,
      );
      return [];
    }
  }

  async getNextUnpaidWinner(auctionId: string): Promise<WinnerRecord | null> {
    return (await this.prisma.repository("winner").findOne({
      where: {
        auction_id: auctionId,
        payment_status: "PENDING",
      },
      order: { rank: "asc" },
    })) as WinnerRecord | null;
  }
}
