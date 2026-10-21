import * as crypto from "crypto";
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
} from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRedis } from "../common/redis.decorator";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Auction } from "../winner/entities/auction.entity";
import { Bid } from "./entities/bid.entity";
import { AuctionClosureService } from "../winner/auction-closure.service";
import { AuctionGateway } from "./gateway/auction.gateway";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentType,
} from "../payment/entities/payment-transaction.entity";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AUCTION_STATE_TTL_BUFFER_SECONDS,
  LOCK_TTL_MS as LOCK_TTL,
  MAX_BIDS_PER_USER_PER_AUCTION,
} from "../../config/constants";

@Injectable()
export class BiddingService {
  private readonly logger = new Logger(BiddingService.name);
  private auctionRepository: any;
  private bidRepository: any;
  private paymentTransactionRepository: any;

  static readonly TRACK_BID_LUA = `
    local freqKey = KEYS[1]
    local uniqueKey = KEYS[2]
    local biddersKey = KEYS[3]
    local totalKey = KEYS[4]
    local amountKey = ARGV[1]
    local amountValue = tonumber(ARGV[2])
    local userId = ARGV[3]
    local ttl = tonumber(ARGV[4])

    local count = tonumber(redis.call('ZINCRBY', freqKey, 1, amountKey))
    local isNewBidder = redis.call('SADD', biddersKey, userId)

    if count == 1 then
      redis.call('ZADD', uniqueKey, amountValue, amountKey)
    else
      redis.call('ZREM', uniqueKey, amountKey)
    end

    redis.call('INCR', totalKey)
    redis.call('EXPIRE', freqKey, ttl)
    redis.call('EXPIRE', uniqueKey, ttl)
    redis.call('EXPIRE', biddersKey, ttl)
    redis.call('EXPIRE', totalKey, ttl)

    return isNewBidder
  `;

  static readonly RELEASE_LOCK_LUA = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  private normalizeAmount(amount: number): string {
    return amount.toFixed(2);
  }

  private getAuctionStateTtl(endTime: Date): number {
    const secondsUntilEnd = Math.ceil((endTime.getTime() - Date.now()) / 1000);
    return Math.max(60, secondsUntilEnd + AUCTION_STATE_TTL_BUFFER_SECONDS);
  }

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly auctionGateway: AuctionGateway,
    @InjectQueue("incoming-bids") private readonly bidQueue: Queue,
    private readonly closureService: AuctionClosureService,
    private readonly bidEncryptionService: BidEncryptionService,
    private readonly notificationDispatchService: NotificationDispatchService,
    @Optional()
    @InjectRepository(Auction)
    auctionRepository?: Repository<Auction>,
    @Optional()
    @InjectRepository(Bid)
    bidRepository?: Repository<Bid>,
    @Optional()
    @InjectRepository(PaymentTransaction)
    paymentTransactionRepository?: Repository<PaymentTransaction>,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    this.auctionRepository =
      auctionRepository ?? this.prisma?.repository("auction");
    this.bidRepository = bidRepository ?? this.prisma?.repository("bid");
    this.paymentTransactionRepository =
      paymentTransactionRepository ??
      this.prisma?.repository("paymentTransaction");
  }

  async placeBid(
    auctionId: string,
    userId: string,
    amount: number,
    endTime: Date,
    ticketNumber: string,
  ): Promise<{
    newTotalBids: number;

    productName: string;
  }> {
    const lockKey = `guessx:auction:${auctionId}:lock`;
    const lockVal = `${userId}:${Date.now()}:${crypto.randomUUID()}`;
    const lockAcquired = await this.redis.set(
      lockKey,
      lockVal,
      "PX",
      LOCK_TTL,
      "NX",
    );

    if (!lockAcquired) {
      throw new ForbiddenException(
        "Auction is temporarily locked. Please retry.",
      );
    }

    try {
      const now = Date.now();
      if (now > endTime.getTime()) {
        throw new ForbiddenException("Auction has closed");
      }

      const feePaid = await this.checkBidFeePaid(userId, auctionId);
      if (!feePaid) {
        throw new BadRequestException(
          "Bid fee not paid. Please pay the bid fee before placing a bid.",
        );
      }

      const userBidCount = await this.bidRepository.count({
        where: { auction_id: auctionId, user_id: userId },
      });
      if (userBidCount >= MAX_BIDS_PER_USER_PER_AUCTION) {
        throw new ForbiddenException(
          `Maximum ${MAX_BIDS_PER_USER_PER_AUCTION} bids per auction reached`,
        );
      }

      const existingBid = await this.bidRepository.findOne({
        where: { auction_id: auctionId, user_id: userId, amount },
      });
      if (existingBid) {
        throw new ConflictException(
          "Duplicate bid detected. Please enter a new amount.",
        );
      }

      const encryptedAmount = this.bidEncryptionService.encrypt(amount);

      await this.bidRepository.save(
        this.bidRepository.create({
          auction_id: auctionId,
          user_id: userId,
          amount,
          bid_time: new Date(),
          encrypted_amount: encryptedAmount,
          ticket_number: ticketNumber,
        }),
      );

      await this.trackBidInRedis(auctionId, userId, amount, endTime);

      this.notifyOutbidBidders(auctionId, userId, amount).catch((e) =>
        this.logger.warn(`Failed to notify outbid bidders: ${e.message}`),
      );

      const totalBidsStr = await this.redis.get(
        `guessx:auction:${auctionId}:total_bids`,
      );
      const totalBids = totalBidsStr ? parseInt(totalBidsStr, 10) : 1;

      this.auctionGateway.broadcastAuctionUpdate({
        auction_id: auctionId,
        total_bids: totalBids,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `Bid placed: auction=${auctionId} user=${userId} amount=${amount} total_bids=${totalBids}`,
      );

      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        select: ["max_bid"],
      });
      if (auction?.max_bid != null && totalBids >= auction.max_bid) {
        this.logger.log(
          `Max bids (${auction.max_bid}) reached for auction ${auctionId}, closing early`,
        );
        this.notifyMaxBidReached(auctionId, totalBids, auction.max_bid).catch(
          (e) =>
            this.logger.warn(
              `Failed to send max-bid notification: ${e.message}`,
            ),
        );
        await this.closureService.closeSingleAuction(auctionId);
      }

      const auctionFull = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ["product"],
      });
      const productName = auctionFull?.product?.name || "Unknown Product";

      this.logger.log(
        `Bid placed: user=${userId} auction=${auctionId} amount=${amount} total_bids=${totalBids}`,
      );

      return { newTotalBids: totalBids, productName };
    } finally {
      try {
        const evalScript = (
          this.redis as Redis & { eval?: (...args: any[]) => any }
        ).eval;
        if (typeof evalScript === "function") {
          await evalScript.call(
            this.redis,
            BiddingService.RELEASE_LOCK_LUA,
            1,
            lockKey,
            lockVal,
          );
        } else {
          await this.redis.del(lockKey);
        }
      } catch (err) {
        this.logger.warn(
          `Failed to release lock for auction ${auctionId}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async notifyOutbidBidders(
    auctionId: string,
    newBidderId: string,
    amount: number,
  ): Promise<void> {
    const amountKey = this.normalizeAmount(amount);
    const freq = await this.redis.zscore(
      `guessx:auction:${auctionId}:frequencies`,
      amountKey,
    );
    if (freq && Number(freq) > 1) {
      const prevBids = await this.bidRepository.find({
        where: { auction_id: auctionId },
        select: ["user_id", "encrypted_amount", "amount"],
        order: { bid_time: "DESC" },
        take: 20,
      });
      const prevBidders = prevBids.filter((b: any) => {
        if (Number(b.amount) !== 0 || !b.encrypted_amount)
          return this.normalizeAmount(Number(b.amount)) === amountKey;
        try {
          return (
            this.normalizeAmount(
              this.bidEncryptionService.decrypt(b.encrypted_amount),
            ) === amountKey
          );
        } catch {
          return false;
        }
      });
      const notified = new Set<string>();
      await Promise.allSettled(
        prevBidders.map(async (bid: any) => {
          if (bid.user_id === newBidderId || notified.has(bid.user_id)) return;
          notified.add(bid.user_id);
          try {
            await this.notificationDispatchService.dispatch(
              "/api/v1/notify/outbid",
              {
                user_id: bid.user_id,
                auction_id: auctionId,
                bid_amount: amount,
              },
            );
          } catch {
            // individual notification failure is non-critical
          }
        }),
      );
    }
  }

  private async notifyMaxBidReached(
    auctionId: string,
    total: number,
    max: number,
  ): Promise<void> {
    try {
      await this.notificationDispatchService.dispatch(
        "/api/v1/notify/max-bid-reached",
        {
          auction_id: auctionId,
          total_bids: total,
          max_bids: max,
        },
      );
    } catch (e) {
      this.logger.warn(`Failed to send max-bid notification: ${e.message}`);
    }
  }

  private async checkBidFeePaid(
    userId: string,
    auctionId: string,
  ): Promise<boolean> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.SUCCESSFUL,
      },
    });
    return !!transaction;
  }

  private async trackBidInRedis(
    auctionId: string,
    userId: string,
    amount: number,
    endTime: Date,
  ): Promise<void> {
    const amountKey = this.normalizeAmount(amount);
    const freqKey = `guessx:auction:${auctionId}:frequencies`;
    const uniqueKey = `guessx:auction:${auctionId}:unique_bids`;
    const biddersKey = `guessx:auction:${auctionId}:bidders`;
    const totalKey = `guessx:auction:${auctionId}:total_bids`;
    const ttl = this.getAuctionStateTtl(endTime);

    const evalScript = (
      this.redis as Redis & { eval?: (...args: any[]) => any }
    ).eval;

    if (typeof evalScript === "function") {
      await evalScript.call(
        this.redis,
        BiddingService.TRACK_BID_LUA,
        4,
        freqKey,
        uniqueKey,
        biddersKey,
        totalKey,
        amountKey,
        String(amount),
        userId,
        String(ttl),
      );
      return;
    }

    throw new Error(
      "Redis Lua scripting is required for bid tracking integrity. Non-atomic fallback is disabled.",
    );
  }
}
