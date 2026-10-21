import {
  Injectable,
  Logger,
  HttpException,
  ServiceUnavailableException,
  BadRequestException,
  Optional,
} from "@nestjs/common";
import * as crypto from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, IsNull, Not, In } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRedis } from "../common/redis.decorator";
import { Redis } from "ioredis";
import {
  Auction,
  AuctionStatus as AS,
  PaymentStatus,
} from "../winner/entities/auction.entity";
import { Winner, WinnerPaymentStatus } from "../winner/entities/winner.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { WinnerService } from "../winner/winner.service";
import { AwashService } from "./awash.service";
import {
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentType,
  PaymentGateway,
} from "./entities/payment-transaction.entity";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";
import { PaymentLinkService } from "./payment-link.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PAYMENT_DEADLINE_HOURS } from "../../config/constants";
import { WalletService } from "../wallet/wallet.service";

const WINNING_PAYMENT_TYPES = [PaymentType.WINNING_BID, PaymentType.WALLET];

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private auctionRepository: any;
  private bidRepository: any;
  private winnerRepository: any;
  private paymentTransactionRepository: any;

  constructor(
    private winnerService: WinnerService,
    private awashService: AwashService,
    private bidEncryptionService: BidEncryptionService,
    @InjectRedis() private readonly redis: Redis,
    private notificationDispatchService: NotificationDispatchService,
    private paymentLinkService: PaymentLinkService,
    @Optional()
    @InjectRepository(Auction)
    auctionRepository?: Repository<Auction>,
    @Optional()
    @InjectRepository(Bid)
    bidRepository?: Repository<Bid>,
    @Optional()
    @InjectRepository(Winner)
    winnerRepository?: Repository<Winner>,
    @Optional()
    @InjectRepository(PaymentTransaction)
    paymentTransactionRepository?: Repository<PaymentTransaction>,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly walletService?: WalletService,
  ) {
    this.auctionRepository =
      auctionRepository ?? this.prisma?.repository("auction");
    this.bidRepository = bidRepository ?? this.prisma?.repository("bid");
    this.winnerRepository =
      winnerRepository ?? this.prisma?.repository("winner");
    this.paymentTransactionRepository =
      paymentTransactionRepository ??
      this.prisma?.repository("paymentTransaction");
  }

  generateProxyUrl(transactionId: string): string {
    return this.paymentLinkService.generateProxyUrl(transactionId);
  }

  validateProxyToken(transactionId: string, token: string): boolean {
    return this.paymentLinkService.validateProxyToken(transactionId, token);
  }

  async fetchAndProxyPaymentPage(
    paymentUrl: string,
  ): Promise<{ body: string; contentType: string }> {
    return this.paymentLinkService.fetchAndProxyPaymentPage(paymentUrl);
  }

  async createPaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    description: string,
    paymentMethod: "AWASH" = "AWASH",
    customerPhone?: string,
  ): Promise<{ paymentUrl: string; proxyUrl: string; transactionId: string }> {
    return this.paymentLinkService.createPaymentLink(
      auctionId,
      userId,
      amount,
      description,
      paymentMethod,
      customerPhone,
    );
  }

  async findTransaction(
    auctionId: string,
    userId: string,
  ): Promise<PaymentTransaction | null> {
    return this.paymentLinkService.findTransaction(auctionId, userId);
  }

  async findTransactionById(
    transactionId: string,
  ): Promise<PaymentTransaction | null> {
    return this.paymentLinkService.findTransactionById(transactionId);
  }

  async createBidFeePaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    paymentMethod: "AWASH" = "AWASH",
  ): Promise<{ paymentUrl: string; proxyUrl: string; transactionId: string }> {
    return this.paymentLinkService.createBidFeePaymentLink(
      auctionId,
      userId,
      amount,
      paymentMethod,
    );
  }

  private async deductFromWallet(
    userId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    if (this.walletService) {
      await this.walletService.deductBidFee(userId, amount);
      return;
    }

    const identityBase =
      process.env.IDENTITY_SERVICE_URL || "http://localhost:3000";

    const res = await fetch(`${identityBase}/api/v1/wallet/deduct-fee`, {
      method: "POST",
      headers: this.getInternalHeaders(),
      body: JSON.stringify({ user_id: userId, amount }),
    });

    if (!res.ok) {
      const text = await res.text();
      let message: string;
      try {
        const parsed = JSON.parse(text);
        message = parsed.message || text;
      } catch {
        message = text;
      }
      if (res.status >= 400 && res.status < 500) {
        throw new HttpException(message, res.status);
      }
      throw new ServiceUnavailableException("Wallet service unavailable");
    }
  }

  async createBidFeeWalletPayment(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    const lockKey = `guessx:bid-fee:${auctionId}:${userId}:lock`;
    const lockVal = `${userId}:${Date.now()}:${crypto.randomUUID()}`;

    if (this.redis?.set) {
      const lockAcquired = await this.redis.set(
        lockKey,
        lockVal,
        "PX" as any,
        10000,
        "NX" as any,
      );
      if (lockAcquired === null) {
        throw new BadRequestException(
          "Bid fee payment is currently being processed. Please retry in a few seconds.",
        );
      }
    }

    try {
      const existing = await this.paymentTransactionRepository.findOne({
        where: {
          auction_id: auctionId,
          user_id: userId,
          payment_type: PaymentType.BID_FEE,
          status: PaymentTransactionStatus.SUCCESSFUL,
        },
      });
      if (existing) return;

      await this.deductFromWallet(
        userId,
        amount,
        `Bid fee for auction ${auctionId}`,
      );

      const shortAuctionId = auctionId.split("-")[0];
      const clientReferenceId = `fee-${shortAuctionId}-${userId.split("-")[0]}-${Date.now()}`;

      const transaction = this.paymentTransactionRepository.create({
        auction_id: auctionId,
        user_id: userId,
        amount,
        client_reference_id: clientReferenceId,
        status: PaymentTransactionStatus.SUCCESSFUL,
        currency: "ETB",
        payment_type: PaymentType.BID_FEE,
        gateway: PaymentGateway.AWASH,
      });
      await this.paymentTransactionRepository.save(transaction);
      this.logger.log(
        `Bid fee paid via wallet for auction ${auctionId}, user ${userId}`,
      );
    } finally {
      try {
        if (typeof this.redis?.eval === "function") {
          await this.redis.eval(
            `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
            1,
            lockKey,
            lockVal,
          );
        } else if (this.redis?.del) {
          await this.redis.del(lockKey);
        }
      } catch {
        // ignore lock release error
      }
    }
  }

  async createWinningWalletPayment(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    const lockKey = `guessx:winning-pay:${auctionId}:${userId}:lock`;
    const lockVal = `${userId}:${Date.now()}:${crypto.randomUUID()}`;

    if (this.redis?.set) {
      const lockAcquired = await this.redis.set(
        lockKey,
        lockVal,
        "PX" as any,
        10000,
        "NX" as any,
      );
      if (lockAcquired === null) {
        throw new BadRequestException(
          "Winning payment is currently being processed. Please retry in a few seconds.",
        );
      }
    }

    try {
      const existing = await this.paymentTransactionRepository.findOne({
        where: {
          auction_id: auctionId,
          user_id: userId,
          payment_type: PaymentType.WALLET,
          status: PaymentTransactionStatus.SUCCESSFUL,
        },
      });
      if (existing) return;

      await this.deductFromWallet(
        userId,
        amount,
        `Winning payment for auction ${auctionId}`,
      );

      const shortAuctionId = auctionId.split("-")[0];
      const clientReferenceId = `win-${shortAuctionId}-${userId.split("-")[0]}-${Date.now()}`;

      const encryptedAmount = this.bidEncryptionService.encrypt(amount);

      const transaction = this.paymentTransactionRepository.create({
        auction_id: auctionId,
        user_id: userId,
        amount,
        encrypted_amount: encryptedAmount,
        client_reference_id: clientReferenceId,
        status: PaymentTransactionStatus.SUCCESSFUL,
        currency: "ETB",
        payment_type: PaymentType.WALLET,
        gateway: PaymentGateway.AWASH,
      });
      await this.paymentTransactionRepository.save(transaction);

      await this.markAsPaid(auctionId, userId);

      this.logger.log(
        `Winning amount paid via wallet for auction ${auctionId}, user ${userId}`,
      );
    } finally {
      try {
        if (typeof this.redis?.eval === "function") {
          await this.redis.eval(
            `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
            1,
            lockKey,
            lockVal,
          );
        } else if (this.redis?.del) {
          await this.redis.del(lockKey);
        }
      } catch {
        // ignore lock release error
      }
    }
  }

  async getBidFeePaymentStatus(
    auctionId: string,
    userId?: string,
  ): Promise<{ status: string; payment_url: string | null }> {
    const where: any = {
      auction_id: auctionId,
      payment_type: PaymentType.BID_FEE,
    };
    if (userId) where.user_id = userId;

    const transaction = await this.paymentTransactionRepository.findOne({
      where,
      order: { created_at: "DESC" },
    });

    let status = transaction?.status || "NONE";

    if (status === "PENDING" && transaction?.client_reference_id) {
      try {
        const remoteStatus = await this.awashService.getPaymentStatus(
          transaction.client_reference_id,
        );
        this.logger.log(
          `Awash returned ${remoteStatus} for ${transaction.client_reference_id}`,
        );
        if (remoteStatus === "SUCCESSFUL") {
          await this.handleSuccessfulPayment(
            transaction.client_reference_id,
            "",
            {},
          );
          status = "SUCCESSFUL";
        } else if (
          ["FAILED", "EXPIRED", "CANCELLED", "REVOKED"].includes(remoteStatus)
        ) {
          await this.paymentTransactionRepository.update(
            { id: transaction.id },
            { status: remoteStatus as PaymentTransactionStatus },
          );
          status = remoteStatus;
        }
      } catch (e) {
        this.logger.warn(
          `Awash status check failed for ${transaction?.client_reference_id}: ${e.message}`,
        );
      }
    }

    return {
      status,
      payment_url: transaction?.awash_payment_url || null,
    };
  }

  async getWinningPaymentStatus(
    auctionId: string,
    userId?: string,
  ): Promise<{ status: string; payment_url: string | null; gateway?: string }> {
    const where: any = {
      auction_id: auctionId,
      payment_type: In(WINNING_PAYMENT_TYPES),
    };
    if (userId) where.user_id = userId;

    const transaction = await this.paymentTransactionRepository.findOne({
      where,
      order: { created_at: "DESC" },
    });

    let status = transaction?.status || "NONE";
    const gateway = transaction?.gateway || "AWASH";

    if (status === "PENDING" && transaction?.client_reference_id) {
      try {
        const remoteStatus = await this.awashService.getPaymentStatus(
          transaction.client_reference_id,
        );
        if (remoteStatus === "SUCCESSFUL") {
          await this.handleSuccessfulPayment(
            transaction.client_reference_id,
            "",
            {},
          );
          status = "SUCCESSFUL";
        } else if (
          ["FAILED", "EXPIRED", "CANCELLED", "REVOKED"].includes(remoteStatus)
        ) {
          await this.paymentTransactionRepository.update(
            { id: transaction.id },
            { status: remoteStatus as PaymentTransactionStatus },
          );
          status = remoteStatus;
        }
      } catch (e) {
        this.logger.warn(
          `Winning payment status check failed for ${transaction.client_reference_id}: ${e.message}`,
        );
      }
    }

    return {
      status,
      payment_url: transaction?.awash_payment_url || null,
      gateway,
    };
  }

  async confirmWinningPayment(
    auctionId: string,
    userId: string,
  ): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error("Auction not found");
    if (auction.winner_user_id !== userId) {
      throw new Error("Only the winner can confirm payment");
    }

    const transaction = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: In(WINNING_PAYMENT_TYPES),
        status: PaymentTransactionStatus.SUCCESSFUL,
      },
      order: { created_at: "DESC" },
    });
    if (!transaction) {
      throw new Error("Winning payment not yet confirmed");
    }

    if (auction.payment_status === PaymentStatus.PAID) {
      return;
    }

    const winner = await this.winnerRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
      },
    });
    if (winner?.payment_status === WinnerPaymentStatus.PAID) {
      return;
    }

    await this.markAsPaid(auctionId, userId);
  }

  async markAsPaid(auctionId: string, userId?: string): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error("Auction not found");
    if (auction.status !== AS.CLOSED) {
      throw new Error("Auction is not eligible for payment");
    }

    if (auction.payment_status === PaymentStatus.PAID) {
      if (!userId) {
        this.logger.log(`Auction ${auctionId} already marked as PAID`);
        return;
      }
      const existingWinner = await this.winnerRepository.findOne({
        where: { auction_id: auctionId, user_id: userId },
      });
      if (existingWinner?.payment_status === WinnerPaymentStatus.PAID) {
        this.logger.log(
          `Auction ${auctionId} winner ${userId} already marked as PAID`,
        );
        return;
      }
    } else if (auction.payment_status !== PaymentStatus.PENDING) {
      throw new Error("Auction is not eligible for payment");
    }

    if (userId) {
      await this.winnerService.updateWinnerPaymentStatus(
        auctionId,
        userId,
        WinnerPaymentStatus.PAID,
      );

      const remainingUnpaid = await this.winnerRepository.count({
        where: {
          auction_id: auctionId,
          payment_status: WinnerPaymentStatus.PENDING,
        },
      });

      if (remainingUnpaid === 0) {
        auction.payment_status = PaymentStatus.PAID;
        auction.last_payment_update = new Date();
        await this.auctionRepository.save(auction);
        await this.redis.set(
          `guessx:auction:${auctionId}:payment_status`,
          "PAID",
        );
        this.logger.log(`Auction ${auctionId}: All winners paid`);
      } else {
        const nextWinner =
          await this.winnerService.getNextUnpaidWinner(auctionId);
        if (nextWinner) {
          const nextDeadline = new Date(
            Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
          );

          auction.winner_user_id = nextWinner.user_id;
          auction.winning_bid_amount = nextWinner.amount;
          auction.payment_deadline = nextDeadline;
          auction.last_payment_update = new Date();
          nextWinner.payment_deadline = nextDeadline;

          await this.winnerRepository.save(nextWinner);
          await this.auctionRepository.save(auction);
        }

        this.logger.log(
          `Auction ${auctionId}: Winner ${userId} paid, ${remainingUnpaid} remaining`,
        );
      }
    } else {
      auction.payment_status = PaymentStatus.PAID;
      auction.last_payment_update = new Date();
      await this.auctionRepository.save(auction);
      await this.redis.set(
        `guessx:auction:${auctionId}:payment_status`,
        "PAID",
      );
      this.logger.log(`Auction ${auctionId}: Payment completed`);
    }
  }

  async handleSuccessfulPayment(
    clientReferenceId: string,
    paymentReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    const result = await this.paymentTransactionRepository.update(
      {
        client_reference_id: clientReferenceId,
        status: Not(PaymentTransactionStatus.SUCCESSFUL),
      },
      {
        status: PaymentTransactionStatus.SUCCESSFUL,
        webhook_payload: webhookPayload,
      },
    );

    const affected = result?.affected ?? result?.count ?? 0;
    if (!affected) {
      this.logger.debug(
        `Transaction ${clientReferenceId} already successful, skipping`,
      );
      return;
    }

    const transaction = await this.paymentTransactionRepository.findOne({
      where: { client_reference_id: clientReferenceId },
    });
    if (!transaction) {
      this.logger.warn(
        `Transaction not found for clientReferenceId: ${clientReferenceId}`,
      );
      return;
    }
    transaction.awash_transaction_id = paymentReferenceId;
    await this.paymentTransactionRepository.save(transaction);

    if (
      transaction.payment_type === PaymentType.WALLET ||
      transaction.payment_type === PaymentType.WINNING_BID
    ) {
      await this.markAsPaid(transaction.auction_id, transaction.user_id);
    } else {
      this.logger.log(
        `Bid fee payment completed for auction ${transaction.auction_id}, user ${transaction.user_id}`,
      );
    }
  }

  async handleFailedPayment(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      {
        status: PaymentTransactionStatus.FAILED,
        webhook_payload: webhookPayload,
      },
    );
  }

  async handleExpiredPaymentLink(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      {
        status: PaymentTransactionStatus.EXPIRED,
        webhook_payload: webhookPayload,
      },
    );
  }

  async handleCancelledPayment(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      {
        status: PaymentTransactionStatus.CANCELLED,
        webhook_payload: webhookPayload,
      },
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async expireOverduePayments(): Promise<void> {
    const now = new Date();
    const overdue = await this.auctionRepository.find({
      where: {
        status: AS.CLOSED,
        payment_status: PaymentStatus.PENDING,
        payment_deadline: LessThan(now),
        winner_user_id: Not(IsNull()),
      },
      relations: ["product"],
      take: 50,
    });

    await Promise.allSettled(
      (overdue as Auction[]).map((auction) =>
        this.handleExpiredPayment(auction).catch((e: unknown) =>
          this.logger.error(
            `Failed to handle expired payment for auction ${auction.id}: ${e instanceof Error ? e.message : String(e)}`,
          ),
        ),
      ),
    );
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcilePendingPayments(): Promise<void> {
    const pendingTransactions = await this.paymentTransactionRepository.find({
      where: { status: PaymentTransactionStatus.PENDING },
      take: 100,
    });

    if (pendingTransactions.length === 0) return;

    this.logger.log(
      `Reconciling ${pendingTransactions.length} pending payments`,
    );

    await Promise.allSettled(
      (pendingTransactions as PaymentTransaction[]).map(async (txn) => {
        try {
          const status = await this.awashService.getPaymentStatus(
            txn.client_reference_id,
          );

          if (status === "SUCCESSFUL") {
            this.logger.log(
              `Reconciliation: payment ${txn.client_reference_id} is SUCCESSFUL`,
            );
            await this.handleSuccessfulPayment(txn.client_reference_id, "", {});
          } else if (
            ["FAILED", "EXPIRED", "CANCELLED", "REVOKED"].includes(status)
          ) {
            this.logger.log(
              `Reconciliation: payment ${txn.client_reference_id} is ${status}`,
            );
            await this.paymentTransactionRepository.update(
              { id: txn.id },
              { status: status as PaymentTransactionStatus },
            );
          }
        } catch (error) {
          this.logger.warn(
            `Reconciliation failed for transaction ${txn.id}: ${error.message}`,
          );
          await this.paymentTransactionRepository.increment(
            { id: txn.id },
            "retry_count",
            1,
          );
        }
      }),
    );
  }

  private async handleExpiredPayment(auction: Auction): Promise<void> {
    this.logger.log(
      `Auction ${auction.id}: Payment deadline passed for winner ${auction.winner_user_id}`,
    );

    const currentWinner = auction.winner_user_id
      ? await this.winnerRepository.findOne({
          where: {
            auction_id: auction.id,
            user_id: auction.winner_user_id,
          },
        })
      : null;

    if (currentWinner) {
      currentWinner.payment_status = WinnerPaymentStatus.EXPIRED;
      await this.winnerRepository.save(currentWinner);
      this.logger.log(
        `Auction ${auction.id}: Winner ${auction.winner_user_id} payment expired`,
      );
    }

    const nextWinner = await this.winnerService.getNextUnpaidWinner(auction.id);

    if (nextWinner) {
      auction.winner_user_id = nextWinner.user_id;
      auction.winning_bid_amount = nextWinner.amount;
      auction.payment_status = PaymentStatus.PENDING;
      auction.payment_deadline = new Date(
        Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
      );
      nextWinner.payment_deadline = auction.payment_deadline;
      await this.winnerRepository.save(nextWinner);
      await this.auctionRepository.save(auction);
      this.logger.log(
        `Auction ${auction.id}: Payment expired, new winner ${nextWinner.user_id} with bid ${nextWinner.amount}`,
      );
      this.notifyNewWinner(
        auction.id,
        nextWinner.user_id,
        nextWinner.amount,
      ).catch((e) =>
        this.logger.warn(`Failed to notify new winner: ${e.message}`),
      );
    } else {
      auction.payment_status = PaymentStatus.EXPIRED;
      auction.status = AS.EXPIRED;

      await this.winnerRepository.update(
        { auction_id: auction.id, payment_status: WinnerPaymentStatus.PENDING },
        { payment_status: WinnerPaymentStatus.EXPIRED },
      );

      await this.auctionRepository.save(auction);
      this.logger.log(
        `Auction ${auction.id}: Payment expired, no more winners, auction expired`,
      );
    }

    this.logPaymentExpiryEvent(
      auction.id,
      currentWinner?.user_id,
      nextWinner?.user_id,
    ).catch((e) =>
      this.logger.warn(`Failed to log payment expiry: ${e.message}`),
    );
  }

  private getInternalHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const internalApiKey = process.env.INTERNAL_API_KEY || "";
    if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
    return headers;
  }

  private async logPaymentExpiryEvent(
    auctionId: string,
    expiredUserId: string | undefined,
    nextUserId: string | undefined,
  ): Promise<void> {
    try {
      await fetch("http://identity-service:3000/api/v1/admin/audit/log", {
        method: "POST",
        headers: this.getInternalHeaders(),
        body: JSON.stringify({
          actor_id: "system",
          actor_phone: "system",
          action: "PAYMENT_EXPIRED",
          entity_type: "auction",
          entity_id: auctionId,
          details: {
            expired_winner: expiredUserId,
            next_winner: nextUserId || null,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (e) {
      this.logger.warn(
        `Failed to log payment expiry for auction ${auctionId}: ${e.message}`,
      );
    }
  }

  private async notifyNewWinner(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    try {
      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ["product"],
      });
      const productName = auction?.product?.name || auctionId;
      const deadline = auction?.payment_deadline?.toISOString();

      await this.notificationDispatchService.dispatch("/api/v1/notify/winner", {
        user_id: userId,
        auction_id: auctionId,
        product_name: productName,
        winning_amount: amount,
        payment_deadline: deadline,
      });
    } catch (e) {
      this.logger.warn(`Failed to notify new winner: ${e.message}`);
    }
  }
}
