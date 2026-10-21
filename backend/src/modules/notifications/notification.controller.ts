import { BetterAuthGuard } from '../../auth/better-auth.guard';
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  BadRequestException,
  Logger,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';

import { InternalAuthGuard } from '../common/internal-auth.guard';
import { NotificationService, WinnerNotificationPayload } from './notification.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notify')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private notificationService: NotificationService) {}

  @UseGuards(InternalAuthGuard)
  @Post('winner')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify winner' })
  async notifyWinner(
    @Body('user_id') userId: string,
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
    @Body('payment_deadline') paymentDeadline?: string,
    @Body('winning_amount') winningAmount?: number,
    @Body('product_description') productDescription?: string,
    @Body('collection_location') collectionLocation?: string,
    @Body('collection_method') collectionMethod?: string,
    @Body('collection_instructions') collectionInstructions?: string,
    @Body('reassignment_reason') reassignmentReason?: string,
  ) {
    if (!userId || !auctionId || !productName) {
      throw new BadRequestException('Missing required fields: user_id, auction_id, product_name');
    }

    const payload: WinnerNotificationPayload = {
      user_id: userId,
      auction_id: auctionId,
      product_name: productName,
      product_description: productDescription,
      winning_amount: winningAmount ?? 0,
      payment_deadline: paymentDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      collection_location: collectionLocation,
      collection_method: collectionMethod,
      collection_instructions: collectionInstructions,
      reassignment_reason: reassignmentReason,
    };

    await this.notificationService.sendWinnerNotification(payload);
    return { notified: true };
  }

  @UseGuards(InternalAuthGuard)
  @Post('winner-bulk')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify winners in bulk' })
  async notifyWinnersBulk(
    @Body('winners') winners: Array<{
      user_id: string;
      auction_id: string;
      product_name: string;
      winning_amount: number;
      payment_deadline: string;
      product_description?: string;
      collection_location?: string;
      collection_method?: string;
      collection_instructions?: string;
    }>,
  ) {
    if (!winners?.length) {
      throw new BadRequestException('No winners provided');
    }
    for (const w of winners) {
      try {
        await this.notificationService.sendWinnerNotification({
          user_id: w.user_id,
          auction_id: w.auction_id,
          product_name: w.product_name,
          product_description: w.product_description,
          winning_amount: w.winning_amount,
          payment_deadline: w.payment_deadline,
          collection_location: w.collection_location,
          collection_method: w.collection_method,
          collection_instructions: w.collection_instructions,
        });
      } catch (e) {
        this.logger.warn(`Failed to notify winner ${w.user_id}: ${e.message}`);
      }
    }
    return { notified: winners.length };
  }

  @UseGuards(InternalAuthGuard)
  @Post('bid-confirmation')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send bid confirmation SMS' })
  async sendBidConfirmationSms(
    @Body('phone') phone: string,
    @Body('product_name') productName: string,
    @Body('bid_amount') bidAmount: number,
    @Body('ticket_number') ticketNumber: string,
  ) {
    if (!phone || !productName || !bidAmount) {
      throw new BadRequestException('Missing required fields');
    }
    const text = `Your bid of ETB ${bidAmount} on '${productName}' has been placed successfully. Your BID ticket number is: ${ticketNumber || 'N/A'}`;
    await this.notificationService.sendSms(phone, text);
    return { notified: true };
  }

  @UseGuards(InternalAuthGuard)
  @Post('outbid')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify outbid' })
  async notifyOutbid(
    @Body('user_id') userId: string,
    @Body('auction_id') auctionId: string,
    @Body('bid_amount') bidAmount: number,
  ) {
    if (!userId || !auctionId || !bidAmount) {
      throw new BadRequestException('Missing required fields');
    }
    await this.notificationService.sendOutbidAlert(userId, auctionId, bidAmount);
    return { notified: true };
  }

  @UseGuards(InternalAuthGuard)
  @Post('auction-started')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify auction started' })
  async notifyAuctionStarted(
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
  ) {
    if (!auctionId || !productName) {
      throw new BadRequestException('Missing required fields');
    }
    await this.notificationService.sendAuctionStarted(productName, auctionId);
    return { notified: true };
  }

  @UseGuards(InternalAuthGuard)
  @Post('auction-extended')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify auction extended' })
  async notifyAuctionExtended(
    @Body('auction_id') auctionId: string,
    @Body('current_bids') currentBids: number,
    @Body('min_bids') minBids: number,
  ) {
    if (!auctionId) throw new BadRequestException('Missing auction_id');
    await this.notificationService.sendToRole('user', 'Auction Extended',
      `Auction extended: only ${currentBids}/${minBids} bids received. More time added!`);
    return { notified: true };
  }

  @UseGuards(InternalAuthGuard)
  @Post('max-bid-reached')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify max bids reached' })
  async notifyMaxBidReached(
    @Body('auction_id') auctionId: string,
    @Body('total_bids') totalBids: number,
    @Body('max_bids') maxBids: number,
  ) {
    if (!auctionId) throw new BadRequestException('Missing auction_id');
    await this.notificationService.sendToRole('user', 'Max Bids Reached',
      `Auction reached ${totalBids}/${maxBids} bids and is closing soon!`);
    return { notified: true };
  }

  @UseGuards(InternalAuthGuard)
  @Post('auction-fair-play-extended')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify fair play extension' })
  async notifyFairPlayExtended(
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
    @Body('total_bids') totalBids: number,
    @Body('extensions') extensions: number,
  ) {
    if (!auctionId || !productName) {
      throw new BadRequestException('Missing required fields: auction_id, product_name');
    }
    await this.notificationService.sendFairPlayExtension(productName, auctionId, totalBids ?? 0, extensions ?? 0);
    return { notified: true };
  }

  @UseGuards(InternalAuthGuard)
  @Post('auction-forced-closure')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify forced closure' })
  async notifyForcedClosure(
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
    @Body('total_bids') totalBids: number,
  ) {
    if (!auctionId || !productName) {
      throw new BadRequestException('Missing required fields: auction_id, product_name');
    }
    await this.notificationService.sendForcedClosure(productName, auctionId, totalBids ?? 0);
    return { notified: true };
  }

  @UseGuards(InternalAuthGuard)
  @Post('ending-soon')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify auction ending soon' })
  async notifyEndingSoon(
    @Body('user_ids') userIds: string[],
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
  ) {
    if (!userIds?.length || !auctionId || !productName) {
      throw new BadRequestException('Missing required fields');
    }
    await this.notificationService.sendAuctionEndingSoon(userIds, auctionId, productName);
    return { notified: userIds.length };
  }

  @UseGuards(InternalAuthGuard)
  @Post('auction-no-bidders-closed')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notify admin when auction closes with no or limited bidders' })
  async notifyAuctionNoBiddersClosed(
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
    @Body('days_open') daysOpen: number,
    @Body('total_bidders') totalBidders?: number,
  ) {
    if (!auctionId) {
      throw new BadRequestException('Missing auction_id');
    }
    const message =
      totalBidders !== undefined && totalBidders > 0
        ? `This auction has been open for the last ${daysOpen} days but received fewer than 100 bidders (${totalBidders} bidders).`
        : `This auction has been open for the last ${daysOpen} days but received no bidders.`;
    await this.notificationService.sendToRole(
      'admin',
      'Auction Closed — No Bidders',
      message,
      {
        auction_id: auctionId,
        type: 'no_bidders_closure',
        days_open: String(daysOpen),
        product_name: productName || '',
      },
      'admin_no_bidders_alert',
      auctionId,
    );
    return { notified: true };
  }

  @UseGuards(BetterAuthGuard)
  @Get('inbox')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get in-app notifications' })
  async getInAppNotifications(
    @Req() req: any,
    @Query('unread') unreadOnly?: string,
  ) {
    return this.notificationService.getInAppNotifications(req.user.id, unreadOnly === 'true');
  }

  @UseGuards(BetterAuthGuard)
  @Post('inbox/:id/read')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationRead(@Param('id') id: string) {
    await this.notificationService.markNotificationRead(id);
    return { read: true };
  }

  @UseGuards(BetterAuthGuard)
  @Post('inbox/read-all')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsRead(@Req() req: any) {
    await this.notificationService.markAllNotificationsRead(req.user.id);
    return { read: true };
  }
}
