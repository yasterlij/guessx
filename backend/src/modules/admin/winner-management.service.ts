import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MIN_VALID_BID_AMOUNT = 1.0;

@Injectable()
export class WinnerManagementService {
  constructor(private prisma: PrismaService) {}

  async getWinners(auctionId: string) {
    const winners = await this.prisma.winner.findMany({
      where: {
        auction_id: auctionId,
        amount: { gte: MIN_VALID_BID_AMOUNT },
      },
      include: {
        user: {
          select: {
            id: true,
            phone_number: true,
            full_name: true,
            email: true,
          },
        },
        auction: {
          select: {
            id: true,
            public_code: true,
            payment_deadline: true,
            payment_status: true,
            second_winner_assigned: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { rank: 'asc' },
    });

    const paymentTransactions = await this.prisma.paymentTransaction.findMany({
      where: {
        auction_id: auctionId,
        payment_type: 'WINNING_BID',
      },
      select: {
        user_id: true,
        status: true,
        amount: true,
        created_at: true,
        updated_at: true,
        gateway: true,
      },
    });

    const paymentMap = new Map(
      paymentTransactions.map((pt) => [pt.user_id, pt]),
    );

    return winners.map((winner) => ({
      ...winner,
      amount: Number(winner.amount),
      payment_transaction: paymentMap.get(winner.user_id) || null,
    }));
  }

  async getPendingWinners() {
    const winners = await this.prisma.winner.findMany({
      where: { payment_status: 'PENDING', amount: { gte: MIN_VALID_BID_AMOUNT } },
      include: {
        user: {
          select: {
            id: true,
            phone_number: true,
            full_name: true,
            email: true,
          },
        },
        auction: {
          select: {
            id: true,
            public_code: true,
            payment_deadline: true,
            payment_status: true,
            second_winner_assigned: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return winners.map((winner) => ({
      ...winner,
      amount: Number(winner.amount),
    }));
  }

  async getExpiredWinners() {
    const now = new Date();
    const winners = await this.prisma.winner.findMany({
      where: {
        payment_status: 'PENDING',
        payment_deadline: { lt: now },
        amount: { gte: MIN_VALID_BID_AMOUNT },
      },
      include: {
        user: {
          select: {
            id: true,
            phone_number: true,
            full_name: true,
            email: true,
          },
        },
        auction: {
          select: {
            id: true,
            public_code: true,
            payment_deadline: true,
            payment_status: true,
            second_winner_assigned: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { payment_deadline: 'asc' },
    });

    return winners.map((winner) => ({
      ...winner,
      amount: Number(winner.amount),
    }));
  }

  async getWinnerStats() {
    const [
      totalWinners,
      paidWinners,
      pendingWinners,
      avgPaymentTime,
    ] = await Promise.all([
      this.prisma.winner.count(),
      this.prisma.winner.count({ where: { payment_status: 'PAID' } }),
      this.prisma.winner.count({ where: { payment_status: 'PENDING' } }),
      this.prisma.$queryRawUnsafe(
        `SELECT AVG(EXTRACT(EPOCH FROM (pt.updated_at - w.created_at)))::float AS avg_seconds
         FROM winners w
         JOIN payment_transactions pt
           ON pt.auction_id = w.auction_id
           AND pt.user_id = w.user_id
           AND pt.payment_type = 'WINNING_BID'
         WHERE pt.status = 'SUCCESSFUL'`,
      ),
    ]);

    const paidRate =
      totalWinners > 0 ? (paidWinners / totalWinners) * 100 : 0;

    return {
      total_winners: totalWinners,
      paid_winners: paidWinners,
      pending_winners: pendingWinners,
      paid_rate: Number(paidRate.toFixed(2)),
      average_payment_time_seconds: Number(
        (avgPaymentTime as any[])[0]?.avg_seconds || 0,
      ),
    };
  }

  async extendPaymentDeadline(
    winnerId: string,
    newDeadline: Date,
    adminId: string,
  ) {
    const winner = await this.prisma.winner.findUnique({
      where: { id: winnerId },
    });

    if (!winner) {
      throw new NotFoundException(`Winner with id ${winnerId} not found`);
    }

    const updated = await this.prisma.winner.update({
      where: { id: winnerId },
      data: { payment_deadline: newDeadline },
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'EXTEND_PAYMENT_DEADLINE',
        entity_type: 'Winner',
        entity_id: winnerId,
        details: {
          previous_deadline: winner.payment_deadline,
          new_deadline: newDeadline,
          auction_id: winner.auction_id,
          user_id: winner.user_id,
        },
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  async confirmPayment(winnerId: string, adminId: string) {
    const winner = await this.prisma.winner.findUnique({
      where: { id: winnerId },
    });

    if (!winner) {
      throw new NotFoundException(`Winner with id ${winnerId} not found`);
    }

    const updated = await this.prisma.winner.update({
      where: { id: winnerId },
      data: { payment_status: 'PAID' },
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'CONFIRM_PAYMENT',
        entity_type: 'Winner',
        entity_id: winnerId,
        details: {
          previous_status: winner.payment_status,
          new_status: 'PAID',
          auction_id: winner.auction_id,
          user_id: winner.user_id,
          amount: Number(winner.amount),
        },
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  /**
   * @deprecated Winner rotation is authoritative in auction-engine's payment.service
   * handleExpiredPayment. This admin-triggered variant exists for manual intervention only.
   * Prefer calling the auction-engine admin API for automated rotation.
   */
  async triggerRotation(auctionId: string, adminId: string) {
    const now = new Date();

    const expiredWinners = await this.prisma.winner.findMany({
      where: {
        auction_id: auctionId,
        payment_status: 'PENDING',
        payment_deadline: { lt: now },
      },
      orderBy: { rank: 'asc' },
    });

    const rotated = await Promise.all(
      expiredWinners.map((winner) =>
        this.prisma.winner.update({
          where: { id: winner.id },
          data: { payment_status: 'EXPIRED' },
        }),
      ),
    );

    const nextEligibleWinner = await this.prisma.winner.findFirst({
      where: {
        auction_id: auctionId,
        payment_status: 'PENDING',
      },
      orderBy: { rank: 'asc' },
    });

    if (nextEligibleWinner) {
      await this.prisma.auction.update({
        where: { id: auctionId },
        data: {
          second_winner_assigned: true,
          winner_user_id: nextEligibleWinner.user_id,
          winning_bid_amount: nextEligibleWinner.amount,
        },
      });
      await this.prisma.auditLog.create({
        data: {
          actor_id: adminId,
          action: 'SECOND_WINNER_ASSIGNED',
          entity_type: 'Auction',
          entity_id: auctionId,
          details: {
            second_winner_id: nextEligibleWinner.user_id,
            amount: Number(nextEligibleWinner.amount),
            assigned_at: new Date().toISOString(),
            reason: 'You have been awarded this auction because the original winner did not complete payment within the specified timeframe.',
          },
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'TRIGGER_ROTATION',
        entity_type: 'Auction',
        entity_id: auctionId,
        details: {
          expired_winner_count: rotated.length,
          rotated_winner_ids: rotated.map((w) => w.id),
          second_winner_assigned: Boolean(nextEligibleWinner),
        },
      },
    });

    return {
      auction_id: auctionId,
      rotated_count: rotated.length,
      rotated_winners: rotated.map((w) => ({
        ...w,
        amount: Number(w.amount),
      })),
    };
  }

  async getBidderHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone_number: true,
        full_name: true,
        email: true,
        wallet_balance: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const [
      totalBids,
      distinctAuctionsParticipated,
      wonWinners,
      recentBids,
    ] = await Promise.all([
      this.prisma.bid.count({ where: { user_id: userId } }),
      this.prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(DISTINCT auction_id)::int as count FROM bids WHERE user_id = $1::uuid`,
        userId,
      ),
      this.prisma.winner.findMany({
        where: { user_id: userId },
        include: {
          auction: {
            select: {
              id: true,
              public_code: true,
              second_winner_assigned: true,
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.bid.findMany({
        where: { user_id: userId },
        include: {
          auction: {
            select: {
              id: true,
              public_code: true,
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { bid_time: 'desc' },
        take: 20,
      }),
    ]);

    const auctionsParticipated = Number(distinctAuctionsParticipated[0]?.count || 0);
    const auctionsWon = wonWinners.length;
    const paymentsCompleted = wonWinners.filter((w) => w.payment_status === 'PAID').length;
    const paymentsDefaulted = wonWinners.filter(
      (w) => w.payment_status === 'EXPIRED' || w.payment_status === 'DEFAULTED',
    ).length;

    const complianceRate =
      paymentsCompleted + paymentsDefaulted === 0
        ? 100
        : Math.round((paymentsCompleted / (paymentsCompleted + paymentsDefaulted)) * 100);

    return {
      user: {
        id: user.id,
        phone_number: user.phone_number || '',
        full_name: user.full_name,
        email: user.email,
        wallet_balance: Number(user.wallet_balance),
        created_at: user.created_at.toISOString(),
      },
      stats: {
        total_bids: totalBids,
        auctions_participated: auctionsParticipated,
        auctions_won: auctionsWon,
        payments_completed: paymentsCompleted,
        payments_defaulted: paymentsDefaulted,
        compliance_rate: complianceRate,
      },
      recent_bids: recentBids.map((b) => ({
        id: b.id,
        auction_id: b.auction_id,
        auction_name: b.auction?.product?.name || 'Auction',
        public_code: b.auction?.public_code || undefined,
        amount: Number(b.amount),
        bid_time: b.bid_time.toISOString(),
        ticket_number: b.ticket_number,
        service_fee_paid: b.service_fee_paid,
      })),
      won_auctions: wonWinners.map((w) => ({
        id: w.id,
        auction_id: w.auction_id,
        auction_name: w.auction?.product?.name || 'Auction',
        public_code: w.auction?.public_code || undefined,
        amount: Number(w.amount),
        rank: w.rank,
        payment_status: w.payment_status || 'PENDING',
        payment_deadline: w.payment_deadline ? w.payment_deadline.toISOString() : null,
        second_winner_assigned: Boolean(w.auction?.second_winner_assigned),
        created_at: w.created_at ? w.created_at.toISOString() : new Date().toISOString(),
      })),
    };
  }

  async sendPaymentReminder(winnerId: string, adminId: string) {
    const winner = await this.prisma.winner.findUnique({
      where: { id: winnerId },
      include: {
        user: true,
        auction: {
          include: { product: true },
        },
      },
    });

    if (!winner) {
      throw new NotFoundException(`Winner with id ${winnerId} not found`);
    }

    const recipient = winner.user?.phone_number || winner.user?.full_name || 'winner';
    const deadlineStr = winner.payment_deadline
      ? winner.payment_deadline.toLocaleDateString()
      : 'your payment window';

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'SEND_PAYMENT_REMINDER',
        entity_type: 'Winner',
        entity_id: winnerId,
        details: {
          user_id: winner.user_id,
          auction_id: winner.auction_id,
          amount: Number(winner.amount),
          payment_deadline: winner.payment_deadline,
          channels: ['SMS', 'PUSH', 'IN_APP'],
        },
      },
    });

    if (winner.user_id) {
      await this.prisma.notificationLog.create({
        data: {
          user_id: winner.user_id,
          auction_id: winner.auction_id,
          type: 'PAYMENT_REMINDER',
          channel: 'PUSH',
          title: 'Payment Reminder for Won Auction',
          body: `Please complete payment of ETB ${Number(winner.amount).toFixed(2)} for ${winner.auction?.product?.name || 'your won auction'} before ${deadlineStr}.`,
          metadata: {
            winner_id: winner.id,
            auction_id: winner.auction_id,
            amount: Number(winner.amount),
            deadline: winner.payment_deadline,
          },
        },
      });
    }

    return {
      success: true,
      message: `Payment reminder sent to ${recipient} via SMS, Push, and In-App notification.`,
    };
  }
}
