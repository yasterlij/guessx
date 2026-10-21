import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Auction } from "./entities/auction.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";
import { PAYMENT_DEADLINE_HOURS } from "../../config/constants";

@Injectable()
export class AuctionClosureEventsService {
  private readonly logger = new Logger(AuctionClosureEventsService.name);

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    private notificationDispatchService: NotificationDispatchService,
  ) {}

  async notifyFairPlayExtension(auctionId: string): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) return;

    const productName = auction.product?.name || auctionId;
    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });

    await this.notificationDispatchService.dispatch(
      "/api/v1/notify/auction-fair-play-extended",
      {
        auction_id: auctionId,
        product_name: productName,
        total_bids: totalBids,
        extensions: auction.extensions,
      },
    );
  }

  async notifyForcedClosure(auctionId: string): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) return;

    const productName = auction.product?.name || auctionId;
    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });

    await this.notificationDispatchService.dispatch(
      "/api/v1/notify/auction-forced-closure",
      {
        auction_id: auctionId,
        product_name: productName,
        total_bids: totalBids,
      },
    );
  }

  async notifyWinners(
    auction: Auction,
    winners: { amount: number; userId: string }[],
  ): Promise<void> {
    const auctionWithProduct = await this.auctionRepository.findOne({
      where: { id: auction.id },
      relations: ["product"],
    });
    const productName = auctionWithProduct?.product?.name || auction.id;
    const productDescription =
      auctionWithProduct?.product?.description || undefined;
    const deadline =
      auction.payment_deadline?.toISOString() ||
      new Date(
        Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
      ).toISOString();

    const winnerPayloads = winners.map((w) => ({
      user_id: w.userId,
      auction_id: auction.id,
      product_name: productName,
      product_description: productDescription,
      winning_amount: w.amount,
      payment_deadline: deadline,
    }));

    await this.notificationDispatchService.dispatch(
      "/api/v1/notify/winner-bulk",
      { winners: winnerPayloads },
    );
  }

  async notifyExtension(
    auctionId: string,
    current: number,
    min: number,
  ): Promise<void> {
    await this.notificationDispatchService.dispatch(
      "/api/v1/notify/auction-extended",
      {
        auction_id: auctionId,
        current_bids: current,
        min_bids: min,
      },
    );
  }

  async notifyNoBiddersExtension(
    auctionId: string,
    extensions: number,
  ): Promise<void> {
    await this.notificationDispatchService.dispatch(
      "/api/v1/notify/auction-extended",
      {
        auction_id: auctionId,
        current_bids: 0,
        min_bids: 100,
        extensions,
      },
    );
  }

  async notifyLimitedBiddersExtension(
    auctionId: string,
    biddersCount: number,
    extensions: number,
  ): Promise<void> {
    await this.notificationDispatchService.dispatch(
      "/api/v1/notify/auction-extended",
      {
        auction_id: auctionId,
        current_bids: biddersCount,
        min_bids: 100,
        extensions,
      },
    );
  }

  async notifyAdminNoBiddersClosed(
    auctionId: string,
    daysOpen: number,
    totalBidders = 0,
  ): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    const productName = auction?.product?.name || auctionId;
    await this.notificationDispatchService.dispatch(
      "/api/v1/notify/auction-no-bidders-closed",
      {
        auction_id: auctionId,
        product_name: productName,
        days_open: daysOpen,
        total_bidders: totalBidders,
      },
    );
  }

  async logClosureEvent(
    auctionId: string,
    action: string,
    winners: { amount: number; userId: string }[],
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      await fetch("http://identity-service:3000/api/v1/admin/audit/log", {
        method: "POST",
        headers,
        body: JSON.stringify({
          actor_id: "system",
          actor_phone: "system",
          action,
          entity_type: "auction",
          entity_id: auctionId,
          details: {
            winners: winners.map((w) => ({
              user_id: w.userId,
              amount: w.amount,
            })),
            winner_count: winners.length,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (e: unknown) {
      this.logger.warn(
        `Failed to log closure event for auction ${auctionId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
