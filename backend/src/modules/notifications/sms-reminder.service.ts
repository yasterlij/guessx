import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from './notification.service';

const PAYMENT_REMINDER_HOURS = 12;
const ENDING_SOON_MINUTES = 5;

@Injectable()
export class SmsReminderService {
  private readonly logger = new Logger(SmsReminderService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendWinnerPaymentReminders(): Promise<void> {
    const now = new Date();
    const deadlineThreshold = new Date(
      now.getTime() + PAYMENT_REMINDER_HOURS * 60 * 60 * 1000,
    );

    try {
      const pendingWinners = await this.prisma.winner.findMany({
        where: {
          payment_status: 'PENDING',
          payment_deadline: { lte: deadlineThreshold, gt: now },
        },
        include: {
          user: { select: { id: true, phone_number: true, full_name: true } },
          auction: {
            select: {
              id: true,
              product: { select: { name: true } },
              winning_bid_amount: true,
              payment_deadline: true,
            },
          },
        },
      });

      if (pendingWinners.length === 0) {
        this.logger.debug('No pending winners within 12h deadline for SMS reminder');
        return;
      }

      this.logger.log(
        `Sending SMS payment reminders to ${pendingWinners.length} winners`,
      );

      for (const winner of pendingWinners) {
        try {
          const phone = winner.user?.phone_number;
          if (!phone) {
            this.logger.warn(
              `Winner ${winner.user_id} has no phone number, skipping SMS`,
            );
            continue;
          }

          const productName = winner.auction?.product?.name || 'your item';
          const winningAmount = winner.amount;
          const deadlineStr = winner.payment_deadline
            ? new Date(winner.payment_deadline).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'soon';

          const message = `Reminder: You won the "${productName}" auction with a bid of ETB ${winningAmount}. Please complete your payment by ${deadlineStr} to avoid losing your win.`;

          await this.notificationService.sendSms(phone, message);
        } catch (error: unknown) {
          this.logger.error(
            `Failed to send SMS reminder to winner ${winner.user_id}: ${(error instanceof Error ? error.message : String(error))}`,
          );
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process winner payment SMS reminders: ${(error instanceof Error ? error.message : String(error))}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendAuctionEndingSoonSms(): Promise<void> {
    const now = new Date();
    const endingThreshold = new Date(
      now.getTime() + ENDING_SOON_MINUTES * 60 * 1000,
    );

    try {
      const endingAuctions = await this.prisma.auction.findMany({
        where: {
          status: 'ACTIVE',
          end_time: { gt: now, lte: endingThreshold },
        },
        select: {
          id: true,
          product: { select: { name: true } },
        },
      });

      if (endingAuctions.length === 0) {
        return;
      }

      await Promise.allSettled(
        endingAuctions.map(async (auction) => {
          try {
            const bidders = await this.prisma.bid.findMany({
              where: { auction_id: auction.id },
              select: {
                user: { select: { id: true, phone_number: true } },
              },
              distinct: ['user_id'],
            });

            if (bidders.length === 0) return;

            const productName = auction.product?.name || 'an auction';
            const message = `Hurry! The "${productName}" auction ends in ${ENDING_SOON_MINUTES} minutes. Place your bid now on Guess X!`;

            await Promise.allSettled(
              bidders.map(async (bidder) => {
                const phone = bidder.user?.phone_number;
                if (!phone || !bidder.user?.id) return;

                try {
                  await this.notificationService.sendSms(phone, message);
                } catch (error: unknown) {
                  this.logger.error(
                    `Failed to send ending-soon SMS to bidder ${bidder.user.id}: ${(error instanceof Error ? error.message : String(error))}`,
                  );
                }
              }),
            );

            this.logger.log(
              `Sent ending-soon SMS to ${bidders.length} bidders for auction ${auction.id}`,
            );
          } catch (error: unknown) {
            this.logger.error(
              `Failed to process ending-soon SMS for auction ${auction.id}: ${(error instanceof Error ? error.message : String(error))}`,
            );
          }
        }),
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process auction ending-soon SMS: ${(error instanceof Error ? error.message : String(error))}`,
      );
    }
  }
}
