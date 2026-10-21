import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Auction, AuctionStatus as AS } from "./entities/auction.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

@Injectable()
export class AuctionNotificationService {
  private readonly logger = new Logger(AuctionNotificationService.name);
  private notified: Set<string> = new Set();

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    private notificationDispatchService: NotificationDispatchService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async notifyStarted(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 15000);
    const windowEnd = new Date(now.getTime() + 15000);

    const startedAuctions = await this.auctionRepository.find({
      where: {
        status: AS.ACTIVE,
        start_time: Between(windowStart, windowEnd),
      },
      relations: ["product"],
      take: 20,
    });

    for (const auction of startedAuctions) {
      if (this.notified.has(`started:${auction.id}`)) continue;
      this.notified.add(`started:${auction.id}`);

      try {
        const productName = auction.product?.name || auction.id;
        await this.notificationDispatchService.dispatch(
          "/api/v1/notify/auction-started",
          {
            auction_id: auction.id,
            product_name: productName,
          },
        );

        this.logger.log(`Notified: ${productName} auction started`);
      } catch (e) {
        this.logger.warn(
          `Failed to notify started for ${auction.id}: ${e.message}`,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async notifyEndingSoon(): Promise<void> {
    const now = Date.now();
    const soon = new Date(now + FIVE_MINUTES_MS);
    const windowStart = new Date(now + FIVE_MINUTES_MS - 15000);
    const windowEnd = new Date(now + FIVE_MINUTES_MS + 15000);

    const endingAuctions = await this.auctionRepository.find({
      where: {
        status: AS.ACTIVE,
        end_time: Between(windowStart, windowEnd),
      },
      relations: ["product"],
      take: 20,
    });

    for (const auction of endingAuctions) {
      if (this.notified.has(auction.id)) continue;
      this.notified.add(auction.id);

      try {
        const bidders = await this.bidRepository
          .createQueryBuilder("bid")
          .where("bid.auction_id = :auctionId", { auctionId: auction.id })
          .select("DISTINCT bid.user_id", "user_id")
          .getRawMany();

        const userIds: string[] = bidders.map((b: any) => b.user_id);
        if (userIds.length === 0) continue;

        const productName = auction.product?.name || auction.id;

        await this.notificationDispatchService.dispatch(
          "/api/v1/notify/ending-soon",
          {
            user_ids: userIds,
            auction_id: auction.id,
            product_name: productName,
          },
        );

        this.logger.log(
          `Notified ${userIds.length} bidders: ${productName} ending soon`,
        );
      } catch (e) {
        this.logger.warn(
          `Failed to notify ending soon for ${auction.id}: ${e.message}`,
        );
      }
    }
  }
}
