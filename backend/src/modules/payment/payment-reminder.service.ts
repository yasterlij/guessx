import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PaymentReminderService {
  private readonly logger = new Logger(PaymentReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatchService: NotificationDispatchService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendPaymentReminders(): Promise<void> {
    try {
      const pendingWinners = await this.prisma.repository("winner").find({
        where: { payment_status: "PENDING" },
        include: {
          user: { select: { id: true, phone_number: true } },
          auction: {
            select: {
              id: true,
              product: { select: { name: true } },
              winning_bid_amount: true,
              payment_deadline: true,
            },
          },
        },
        take: 200,
      });

      if (pendingWinners.length === 0) {
        this.logger.debug("No pending winners for payment reminder");
        return;
      }

      this.logger.log(
        `Sending payment reminders to ${pendingWinners.length} pending winners`,
      );

      await Promise.allSettled(
        pendingWinners.map(async (winner) => {
          try {
            const productName = winner.auction?.product?.name || "your auction";
            const winningAmount =
              winner.auction?.winning_bid_amount ?? winner.amount;
            const deadline = winner.auction?.payment_deadline;
            const deadlineStr = deadline
              ? new Date(deadline).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "soon";

            await this.notificationDispatchService.dispatch(
              "/api/v1/notify/winner",
              {
                user_id: winner.user_id,
                auction_id: winner.auction_id,
                product_name: productName,
                winning_amount: Number(winningAmount),
                payment_deadline: deadline
                  ? new Date(deadline).toISOString()
                  : undefined,
              },
            );

            await this.logReminderSent(winner.auction_id, winner.user_id, {
              product_name: productName,
              winning_amount: Number(winningAmount),
              payment_deadline: deadlineStr,
            });

            this.logger.log(
              `Payment reminder sent to user ${winner.user_id} for auction ${winner.auction_id}`,
            );
          } catch (error: unknown) {
            this.logger.error(
              `Failed to send payment reminder to winner ${winner.user_id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process payment reminders: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async logReminderSent(
    auctionId: string,
    userId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.repository("auditLog").create({
        actor_id: "system",
        actor_phone: "system",
        action: "PAYMENT_REMINDER_SENT",
        entity_type: "winner",
        entity_id: userId,
        details: {
          auction_id: auctionId,
          ...details,
          sent_at: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to log payment reminder audit entry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
