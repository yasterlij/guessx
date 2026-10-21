import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  Auction,
  AuctionStatus as AS,
  PaymentStatus,
} from "./entities/auction.entity";
import { Winner, WinnerPaymentStatus } from "./entities/winner.entity";
import { WinnerService } from "./winner.service";
import { Bid } from "../bidding/entities/bid.entity";
import { BullMqWorker } from "../worker/bullmq.worker";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { InjectRedis } from "../common/redis.decorator";
import { AuctionClosureEventsService } from "./auction-closure-events.service";
import {
  PAYMENT_DEADLINE_HOURS,
  AUCTION_STATE_TTL_BUFFER_SECONDS,
  MAX_AUCTION_EXTENSIONS,
  AUCTION_EXTENSION_DAYS,
  MIN_BIDDERS_LIMIT,
} from "../../config/constants";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 300;

@Injectable()
export class AuctionClosureService {
  private readonly logger = new Logger(AuctionClosureService.name);

  private normalizeAmount(amount: string | number): string {
    return Number(amount).toFixed(2);
  }

  private getAuctionStateTtl(endTime: Date): number {
    const secondsUntilEnd = Math.ceil((endTime.getTime() - Date.now()) / 1000);
    return Math.max(60, secondsUntilEnd + AUCTION_STATE_TTL_BUFFER_SECONDS);
  }

  private async refreshAuctionRedisTtl(
    auctionId: string,
    endTime: Date,
  ): Promise<void> {
    const ttl = this.getAuctionStateTtl(endTime);
    await this.redis
      .multi()
      .expire(`guessx:auction:${auctionId}:frequencies`, ttl)
      .expire(`guessx:auction:${auctionId}:unique_bids`, ttl)
      .expire(`guessx:auction:${auctionId}:bidders`, ttl)
      .expire(`guessx:auction:${auctionId}:total_bids`, ttl)
      .exec();
  }

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(Winner)
    private winnerRepository: Repository<Winner>,
    private winnerService: WinnerService,
    private bullMqWorker: BullMqWorker,
    private bidEncryptionService: BidEncryptionService,
    @InjectRedis() private readonly redis: Redis,
    private closureEventsService: AuctionClosureEventsService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async closeExpiredAuctions(): Promise<void> {
    const now = new Date();

    const expiredAuctions = await this.auctionRepository.find({
      where: {
        status: AS.ACTIVE,
        end_time: LessThan(now),
      },
      take: 100,
    });

    await Promise.allSettled(
      expiredAuctions.map((auction) =>
        this.closeAuction(auction).catch((error) =>
          this.logger.error(
            `Failed to close auction ${auction.id}: ${error.message}`,
            error.stack,
          ),
        ),
      ),
    );
  }

  private async closeAuction(
    auction: Auction,
    isManualAdminClose = false,
  ): Promise<void> {
    await this.bullMqWorker.flushAuction(auction.id);
    const { winningAmounts, totalBids, winners } =
      await this.winnerService.calculateWinners(auction.id);
    const uniqueBidders = await this.winnerService.getUniqueBiddersCount(
      auction.id,
    );
    const WEEK_MS = AUCTION_EXTENSION_DAYS * 24 * 60 * 60 * 1000;

    // Rule 1, 2, 3: No Bidders
    if (!isManualAdminClose && (totalBids === 0 || uniqueBidders === 0)) {
      if ((auction.extensions || 0) < MAX_AUCTION_EXTENSIONS) {
        auction.extensions = (auction.extensions || 0) + 1;
        auction.end_time = new Date(Date.now() + WEEK_MS);
        await this.auctionRepository.save(auction);
        await this.refreshAuctionRedisTtl(auction.id, auction.end_time);
        this.logger.log(
          `Auction ${auction.id}: No bidders (extension #${auction.extensions}/${MAX_AUCTION_EXTENSIONS}), extended 7 days`,
        );
        this.closureEventsService
          .notifyNoBiddersExtension(auction.id, auction.extensions)
          .catch((e) =>
            this.logger.warn(
              `Failed to send extension notification: ${e.message}`,
            ),
          );
        return;
      }

      const startOrCreated =
        auction.created_at || auction.start_time || new Date();
      const daysOpen = Math.max(
        1,
        Math.round(
          (Date.now() - new Date(startOrCreated).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );

      auction.status = AS.CLOSED;
      auction.winner_user_id = null as any;
      auction.winning_bid_amount = null as any;
      await this.auctionRepository.save(auction);
      await this.winnerService.cleanupAuctionKeys(auction.id);

      this.logger.log(
        `Auction ${auction.id}: Max extensions (${MAX_AUCTION_EXTENSIONS}) reached with no bidders, closed permanently`,
      );

      this.closureEventsService
        .notifyAdminNoBiddersClosed(auction.id, daysOpen, 0)
        .catch((e) =>
          this.logger.warn(`Failed to notify admin of closure: ${e.message}`),
        );
      this.closureEventsService
        .logClosureEvent(auction.id, "NO_BIDDERS_FINAL_CLOSE", [])
        .catch((e) =>
          this.logger.warn(`Failed to log closure event: ${e.message}`),
        );
      return;
    }

    // Rule 4: Limited Bidders Rule
    if (
      !isManualAdminClose &&
      (uniqueBidders < MIN_BIDDERS_LIMIT ||
        (auction.min_bid != null && totalBids < auction.min_bid))
    ) {
      if ((auction.extensions || 0) < MAX_AUCTION_EXTENSIONS) {
        auction.extensions = (auction.extensions || 0) + 1;
        auction.end_time = new Date(Date.now() + WEEK_MS);
        await this.auctionRepository.save(auction);
        await this.refreshAuctionRedisTtl(auction.id, auction.end_time);
        this.logger.log(
          `Auction ${auction.id}: Limited bidders (${uniqueBidders}/${MIN_BIDDERS_LIMIT}) (extension #${auction.extensions}/${MAX_AUCTION_EXTENSIONS}), extended 7 days`,
        );
        this.closureEventsService
          .notifyLimitedBiddersExtension(
            auction.id,
            uniqueBidders,
            auction.extensions,
          )
          .catch((e) =>
            this.logger.warn(
              `Failed to send limited bidders extension notification: ${e.message}`,
            ),
          );
        return;
      }

      const startOrCreated =
        auction.created_at || auction.start_time || new Date();
      const daysOpen = Math.max(
        1,
        Math.round(
          (Date.now() - new Date(startOrCreated).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );

      auction.status = AS.CLOSED;
      auction.winner_user_id = null as any;
      auction.winning_bid_amount = null as any;
      await this.auctionRepository.save(auction);
      await this.winnerService.cleanupAuctionKeys(auction.id);

      this.logger.log(
        `Auction ${auction.id}: Max extensions (${MAX_AUCTION_EXTENSIONS}) reached with limited bidders (${uniqueBidders}), closed permanently`,
      );

      this.closureEventsService
        .notifyAdminNoBiddersClosed(auction.id, daysOpen, uniqueBidders)
        .catch((e) =>
          this.logger.warn(`Failed to notify admin of closure: ${e.message}`),
        );
      this.closureEventsService
        .logClosureEvent(auction.id, "LIMITED_BIDDERS_FINAL_CLOSE", [])
        .catch((e) =>
          this.logger.warn(`Failed to log closure event: ${e.message}`),
        );
      return;
    }

    if (!isManualAdminClose && totalBids > 0 && winners.length === 0) {
      if ((auction.extensions || 0) >= MAX_AUCTION_EXTENSIONS) {
        auction.status = AS.CLOSED;
        auction.winner_user_id = null as any;
        auction.winning_bid_amount = null as any;
        await this.auctionRepository.save(auction);
        await this.winnerService.cleanupAuctionKeys(auction.id);
        this.logger.log(
          `Auction ${auction.id}: Max extensions (${MAX_AUCTION_EXTENSIONS}) reached with no unique bids, closed`,
        );
        return;
      }
      auction.extensions = (auction.extensions || 0) + 1;
      auction.end_time = new Date(Date.now() + WEEK_MS);
      await this.auctionRepository.save(auction);
      await this.refreshAuctionRedisTtl(auction.id, auction.end_time);
      this.logger.log(
        `Auction ${auction.id}: No unique bids among ${totalBids} bids (extension #${auction.extensions}/${MAX_AUCTION_EXTENSIONS}), extended 7 days for fair play`,
      );
      this.closureEventsService
        .notifyFairPlayExtension(auction.id)
        .catch((e) =>
          this.logger.warn(
            `Failed to send fair play notification: ${e.message}`,
          ),
        );
      return;
    }

    const queryRunner =
      this.auctionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (totalBids === 0) {
        auction.status = AS.CLOSED;
        auction.winner_user_id = null as any;
        auction.winning_bid_amount = null as any;
        this.logger.log(`Auction ${auction.id}: No bids, closed`);
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
      } else if (winners.length > 0) {
        const winningBids: Bid[] = [];
        for (const w of winners) {
          const bid = await this.findWinBidWithRetry(
            queryRunner,
            auction.id,
            w.amount,
            w.userId,
          );
          if (bid) winningBids.push(bid);
        }

        if (winningBids.length === 0) {
          auction.status = AS.CLOSED;
          auction.winner_user_id = null as any;
          auction.winning_bid_amount = null as any;
          this.logger.warn(
            `Auction ${auction.id}: No winning bids found in DB, closed`,
          );
          await queryRunner.manager.save(auction);
          await queryRunner.commitTransaction();
        } else {
          const paymentDeadline = new Date(
            Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
          );

          auction.winner_user_id = winningBids[0].user_id;
          const winAmount =
            Number(winningBids[0].amount) === 0 &&
            winningBids[0].encrypted_amount
              ? this.normalizeAmount(
                  this.bidEncryptionService.decrypt(
                    winningBids[0].encrypted_amount,
                  ),
                )
              : this.normalizeAmount(winningBids[0].amount);
          auction.winning_bid_amount = Number(winAmount);
          auction.status = AS.CLOSED;
          auction.payment_status = PaymentStatus.PENDING;
          auction.payment_deadline = paymentDeadline;

          await queryRunner.manager.save(auction);

          const winnerEntities = await this.winnerService.persistWinners(
            auction.id,
            winners,
            paymentDeadline,
            queryRunner.manager,
          );

          await queryRunner.commitTransaction();

          this.logger.log(
            `Auction ${auction.id}: CLOSED with ${winnerEntities.length} winner(s). ` +
              `Amounts: [${winners.map((w) => w.amount).join(", ")}]`,
          );

          this.closureEventsService
            .logClosureEvent(auction.id, "AUTO_CLOSE", winners)
            .catch((e) =>
              this.logger.warn(`Failed to log closure event: ${e.message}`),
            );
          this.closureEventsService
            .notifyWinners(auction, winners)
            .catch((e) =>
              this.logger.warn(
                `Failed to send winner notifications: ${e.message}`,
              ),
            );
        }
      } else {
        auction.status = AS.CLOSED;
        auction.winner_user_id = null as any;
        auction.winning_bid_amount = null as any;
        this.logger.log(
          `Auction ${auction.id}: All bid amounts duplicated, closed`,
        );
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Transaction failed for auction ${auction.id}: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.winnerService.cleanupAuctionKeys(auction.id);
  }

  async closeSingleAuction(
    auctionId: string,
    actorId?: string,
  ): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error(`Auction ${auctionId} not found`);
    if (auction.status !== AS.ACTIVE)
      throw new Error(
        `Auction ${auctionId} is not active (status: ${auction.status})`,
      );

    await this.bullMqWorker.flushAuction(auction.id);

    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });
    const hasUnique = await this.winnerService.hasUniqueBids(auctionId);
    if (!hasUnique) {
      throw new BadRequestException(
        `No unique bids among ${totalBids} bids. Auction cannot close without a unique winner unless forced.`,
      );
    }

    auction.end_time = new Date();
    await this.auctionRepository.save(auction);

    await this.closeAuction(auction, true);

    if (actorId) {
      const closedAuction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ["product"],
      });
      const winners = await this.winnerRepository.find({
        where: { auction_id: auctionId },
        order: { rank: "ASC" },
      });
      await this.closureEventsService.logClosureEvent(
        auctionId,
        "ADMIN_CLOSE",
        winners.map((w) => ({ amount: w.amount, userId: w.user_id })),
      );
      return closedAuction as Auction;
    }

    return this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    }) as Promise<Auction>;
  }

  async forceCloseSingleAuction(
    auctionId: string,
    actorId?: string,
  ): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) throw new Error(`Auction ${auctionId} not found`);
    if (auction.status !== AS.ACTIVE)
      throw new Error(
        `Auction ${auctionId} is not active (status: ${auction.status})`,
      );

    await this.bullMqWorker.flushAuction(auction.id);

    auction.end_time = new Date();
    auction.status = AS.CLOSED;
    auction.winner_user_id = null as any;
    auction.winning_bid_amount = null as any;
    await this.auctionRepository.save(auction);

    await this.winnerService.cleanupAuctionKeys(auction.id);

    this.logger.log(
      `Auction ${auctionId}: Force closed by admin with no unique bids`,
    );

    this.closureEventsService
      .notifyForcedClosure(auction.id)
      .catch((e) =>
        this.logger.warn(
          `Failed to send forced closure notification: ${e.message}`,
        ),
      );

    if (actorId) {
      await this.closureEventsService.logClosureEvent(
        auctionId,
        "ADMIN_FORCE_CLOSE",
        [],
      );
    }

    return this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    }) as Promise<Auction>;
  }

  private async findWinBidWithRetry(
    queryRunner: any,
    auctionId: string,
    amount: number,
    userId: string,
  ): Promise<Bid | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const bids = await queryRunner.manager.find(Bid, {
        where: { auction_id: auctionId, user_id: userId },
        order: { bid_time: "ASC" },
      });
      const match = bids.find((b: Bid) => {
        if (Number(b.amount) !== 0 || !b.encrypted_amount)
          return (
            this.normalizeAmount(b.amount) === this.normalizeAmount(amount)
          );
        try {
          return (
            this.normalizeAmount(
              this.bidEncryptionService.decrypt(b.encrypted_amount),
            ) === this.normalizeAmount(amount)
          );
        } catch {
          return false;
        }
      });
      if (match) return match;

      if (attempt < MAX_RETRIES - 1) {
        this.logger.debug(
          `Win bid not found (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    this.logger.warn(
      `Win bid amount=${amount} user=${userId} not found in DB after ${MAX_RETRIES} attempts for auction ${auctionId}`,
    );
    return null;
  }
}
