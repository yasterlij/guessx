import * as crypto from "crypto";
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { BiddingService } from "./bidding.service";
import { BidDto } from "./dto/bid.dto";
import { BiddingWindowInterceptor } from "../common/bidding-window.interceptor";
import { ThrottleGuard } from "../common/throttle.guard";
import { NonceGuard } from "../common/nonce.guard";
import { WinnerService } from "../winner/winner.service";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Auction, AuctionStatus } from "../winner/entities/auction.entity";
import { Winner } from "../winner/entities/winner.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";
import { MIN_VALID_BID_AMOUNT } from "../../config/constants";

@Controller("auctions")
export class BiddingController {
  private readonly logger = new Logger(BiddingController.name);

  constructor(
    private biddingService: BiddingService,
    private winnerService: WinnerService,
    private bidEncryptionService: BidEncryptionService,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(Winner)
    private winnerRepository: Repository<Winner>,
    private notificationDispatchService: NotificationDispatchService,
  ) {}

  @Post(":id/bid")
  @UseInterceptors(BiddingWindowInterceptor)
  @UseGuards(JwtAuthGuard, ThrottleGuard, NonceGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async placeBid(
    @Param("id") auctionId: string,
    @Body() dto: BidDto,
    @Req()
    req: {
      user: { id: string; role?: string };
      auction: { end_time: Date; product?: { name?: string } };
    },
  ) {
    const { amount } = dto;
    const user = req.user;
    const auction = req.auction;

    if (user.role === "admin") {
      throw new ForbiddenException(
        "Administrators are not allowed to participate in bidding.",
      );
    }

    const ticketNumber = `BID_${crypto.randomBytes(6).toString("hex")}`;

    const result = await this.biddingService.placeBid(
      auctionId,
      user.id,
      amount,
      auction.end_time,
      ticketNumber,
    );

    this.sendBidSms(user, auction, amount, ticketNumber).catch((e: unknown) =>
      this.logger.warn(
        `Failed to send bid SMS: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );

    return {
      message: "Bid placed successfully",
      new_total_bids: result.newTotalBids,
      ticket_number: ticketNumber,
    };
  }

  @Get(":id/my-bids")
  @UseGuards(JwtAuthGuard)
  async getMyBids(
    @Param("id") auctionId: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    const bids = await this.bidRepository.find({
      where: { auction_id: auctionId, user_id: req.user.id },
      order: { bid_time: "DESC" },
    });
    return {
      auction_id: auctionId,
      bids: bids.map((b) => ({
        amount: this.resolveBidAmount(b),
        bid_time: b.bid_time,
        ticket_number: b.ticket_number,
      })),
    };
  }

  @Get(":id/result")
  @UseGuards(JwtAuthGuard)
  async getAuctionResult(
    @Param("id") auctionId: string,
    @Req() req: { user: { id: string; role?: string } },
  ) {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) throw new NotFoundException("Auction not found");

    const stats = await this.winnerService.getAuctionStats(auctionId);
    const { winners } = await this.winnerService.calculateWinners(auctionId);

    const userBid = await this.bidRepository.findOne({
      where: { auction_id: auctionId, user_id: req.user.id },
      order: { bid_time: "DESC" },
    });

    const persistedWinners = await this.winnerRepository.find({
      where: { auction_id: auctionId },
      order: { rank: "ASC" },
    });

    const validPersistedWinners = persistedWinners.filter(
      (w) => Number(w.amount) >= MIN_VALID_BID_AMOUNT,
    );
    const validCalculatedWinners = winners.filter(
      (w) => w.amount >= MIN_VALID_BID_AMOUNT,
    );

    const isCallerAdmin = req.user?.role === "admin";
    const allWinners = await Promise.all(
      (validPersistedWinners.length > 0
        ? validPersistedWinners
        : validCalculatedWinners
      ).map(async (w: any) => {
        const winnerUserId = w.user_id || w.userId;
        const isSelf = req.user?.id === winnerUserId;
        const info = await this.resolveWinnerUserInfo(winnerUserId);
        const rawPhone = info?.phone || null;
        const phone = isCallerAdmin || isSelf ? rawPhone : this.maskPhone(rawPhone);
        return {
          user_id: winnerUserId,
          amount: w.amount,
          rank: w.rank,
          payment_status: w.payment_status,
          payment_deadline: w.payment_deadline,
          name: info?.name || null,
          phone,
        };
      }),
    );

    const winningAmount =
      auction.winning_bid_amount != null &&
      Number(auction.winning_bid_amount) >= MIN_VALID_BID_AMOUNT
        ? Number(auction.winning_bid_amount)
        : validCalculatedWinners.length > 0
          ? validCalculatedWinners[0].amount
          : null;

    const primaryWinnerInfo = auction.winner_user_id
      ? await this.resolveWinnerUserInfo(auction.winner_user_id)
      : null;
    const isPrimaryWinnerSelf = req.user?.id === auction.winner_user_id;
    const rawPrimaryPhone = primaryWinnerInfo?.phone || null;
    const primaryPhone =
      isCallerAdmin || isPrimaryWinnerSelf
        ? rawPrimaryPhone
        : this.maskPhone(rawPrimaryPhone);

    return {
      id: auction.id,
      product: auction.product,
      status: auction.status,
      winner_user_id: allWinners.length > 0 ? auction.winner_user_id : null,
      winner_name:
        allWinners.length > 0 ? primaryWinnerInfo?.name || null : null,
      winner_phone:
        allWinners.length > 0 ? primaryPhone : null,
      winning_bid_amount: winningAmount,
      total_bids: stats.totalBids,
      unique_bidders: stats.uniqueBidders,
      lowest_unique_bid: stats.lowestUniqueBid,
      all_winners: allWinners,
      winners_count: allWinners.length,
      my_bid: userBid
        ? {
            amount: this.resolveBidAmount(userBid),
            encrypted_amount: null,
            amount_encrypted: false,
            bid_time: userBid.bid_time,
            service_fee_paid: userBid.service_fee_paid,
          }
        : null,
      payment_status: auction.payment_status,
      payment_deadline: auction.payment_deadline,
      created_at: auction.created_at,
    };
  }

  private async sendBidSms(
    user: any,
    auction: any,
    amount: number,
    ticketNumber: string,
  ): Promise<void> {
    try {
      await this.notificationDispatchService.dispatch(
        "/api/v1/notify/bid-confirmation",
        {
          phone: user.phone,
          product_name: auction.product?.name || "Unknown",
          bid_amount: amount,
          ticket_number: ticketNumber,
        },
      );
    } catch (e) {
      this.logger.warn(`Failed to send bid SMS: ${e.message}`);
    }
  }

  private async resolveWinnerUserInfo(
    userId: string | null,
  ): Promise<{ name: string | null; phone: string | null } | null> {
    if (!userId) return null;
    try {
      const internalHeaders: Record<string, string> = {};
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey)
        internalHeaders["x-internal-api-key"] = internalApiKey;
      const res = await fetch(
        `http://identity-service:3000/api/v1/wallet/user/${userId}/internal`,
        { headers: internalHeaders },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return {
        name: data.full_name || data.phone_number || null,
        phone: data.phone_number || null,
      };
    } catch (e) {
      this.logger.warn(
        `Failed to resolve winner info for ${userId}: ${e.message}`,
      );
      return null;
    }
  }

  private resolveBidAmount(bid: Bid): number {
    if (bid.amount !== 0 || !bid.encrypted_amount) return Number(bid.amount);
    try {
      return Number(this.bidEncryptionService.decrypt(bid.encrypted_amount));
    } catch {
      return 0;
    }
  }

  private maskPhone(phone: string | null): string | null {
    if (!phone) return null;
    const cleaned = phone.trim();
    if (cleaned.length <= 4) return "****";
    return `${cleaned.slice(0, 4)}****${cleaned.slice(-2)}`;
  }
}
