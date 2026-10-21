import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const SMSETHIOPIA_URL = 'https://smsethiopia.com/api/sms/send';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface WinnerNotificationPayload {
  user_id: string;
  auction_id: string;
  product_name: string;
  product_description?: string;
  winning_amount: number;
  payment_deadline: string;
  collection_location?: string;
  collection_method?: string;
  collection_instructions?: string;
  reassignment_reason?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async sendPush(userId: string, payload: PushPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) { this.logger.warn(`User ${userId} not found for push notification`); return; }
    const token = user.fcm_token;
    if (!token) { this.logger.warn(`User ${userId} has no push token`); return; }
    this.logger.log(`[PUSH] To ${userId}: "${payload.title}" - "${payload.body}"`);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ to: token, title: payload.title, body: payload.body, data: payload.data || {}, sound: 'default' }),
      });
      if (res.ok) {
        const result: any = await res.json();
        const first = result.data?.[0];
        if (first?.status === 'error') { this.logger.warn(`Expo push error for user ${userId}: ${first.message}`); }
      } else { this.logger.warn(`Expo push HTTP ${res.status} for user ${userId}`); }
    } catch (error: unknown) { this.logger.error(`Push failed for user ${userId}: ${(error instanceof Error ? error.message : String(error))}`); }
  }

  async sendSms(phone: string, text: string): Promise<void> {
    const apiKey = this.configService.get<string>('app.smsApiKey');
    if (!apiKey) { this.logger.warn('SMS_API_KEY not configured, skipping SMS'); return; }
    const msisdn = phone.startsWith('0') ? `251${phone.slice(1)}` : phone.startsWith('251') ? phone : `251${phone}`;
    try {
      const res = await fetch(SMSETHIOPIA_URL, { method: 'POST', headers: { KEY: apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ msisdn, text }) });
      if (res.ok) { this.logger.log(`[SMS] Sent to ${msisdn}: "${text.slice(0, 50)}..."`); }
      else { const body = await res.text(); this.logger.warn(`[SMS] Failed (${res.status}): ${body}`); }
    } catch (error: unknown) { this.logger.error(`[SMS] Error sending to ${msisdn}: ${(error instanceof Error ? error.message : String(error))}`); }
  }

  async persistNotification(log: any): Promise<any> {
    return this.prisma.notificationLog.create({ data: log });
  }

  async sendWinnerNotification(payload: WinnerNotificationPayload): Promise<void> {
    const deadlineDate = new Date(payload.payment_deadline);
    const deadlineFormatted = deadlineDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const pushTitle = payload.reassignment_reason ? 'You Won! (Second Winner Assigned)' : 'You Won!';
    const pushBody = payload.reassignment_reason
      ? `Congratulations! You won the ${payload.product_name} auction with a unique bid of ETB ${payload.winning_amount.toFixed(2)}. ${payload.reassignment_reason} Payment due by ${deadlineFormatted}.`
      : `Congratulations! You won the ${payload.product_name} auction with a unique bid of ETB ${payload.winning_amount.toFixed(2)}. Payment due by ${deadlineFormatted}.`;
    await this.sendPush(payload.user_id, { title: pushTitle, body: pushBody, data: { auction_id: payload.auction_id, type: 'won', winning_amount: String(payload.winning_amount), payment_deadline: payload.payment_deadline, reassignment_reason: payload.reassignment_reason || '' } });
    const inAppBody = [
      `Congratulations! You won the "${payload.product_name}" auction.`,
      `Your unique winning bid: ETB ${payload.winning_amount.toFixed(2)}`,
      `Payment deadline: ${deadlineFormatted}`,
    ];
    if (payload.reassignment_reason) inAppBody.push(`Reason: ${payload.reassignment_reason}`);
    if (payload.product_description) inAppBody.push(`Item: ${payload.product_description}`);
    if (payload.collection_location) inAppBody.push(`Collection: ${payload.collection_location}`);
    if (payload.collection_instructions) inAppBody.push(`Instructions: ${payload.collection_instructions}`);
    const metadata: Record<string, any> = { auction_id: payload.auction_id, winning_amount: payload.winning_amount, payment_deadline: payload.payment_deadline, product_name: payload.product_name };
    if (payload.reassignment_reason) metadata.reassignment_reason = payload.reassignment_reason;
    if (payload.collection_location) metadata.collection_location = payload.collection_location;
    if (payload.collection_method) metadata.collection_method = payload.collection_method;
    if (payload.collection_instructions) metadata.collection_instructions = payload.collection_instructions;
    await this.persistNotification({ user_id: payload.user_id, auction_id: payload.auction_id, type: 'winner', channel: 'INAPP', title: pushTitle, body: inAppBody.join('\n'), metadata });
    this.logger.log(`Winner notification sent to user ${payload.user_id} for auction ${payload.auction_id}, amount ETB ${payload.winning_amount}`);
  }

  async getInAppNotifications(userId: string, unreadOnly = false): Promise<any[]> {
    const where: any = { user_id: userId, channel: 'INAPP' };
    if (unreadOnly) where.read = false;
    return this.prisma.notificationLog.findMany({ where, orderBy: { sent_at: 'desc' }, take: 50 });
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.prisma.notificationLog.update({ where: { id: notificationId }, data: { read: true } });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.prisma.notificationLog.updateMany({ where: { user_id: userId, channel: 'INAPP', read: false }, data: { read: true } });
  }

  async sendOutbidAlert(userId: string, auctionId: string, bidAmount: number): Promise<void> {
    await this.sendPush(userId, { title: 'Outbid Alert', body: `Someone just bid ${bidAmount} ETB. Check the app!`, data: { auction_id: auctionId, type: 'outbid' } });
    await this.persistNotification({ user_id: userId, auction_id: auctionId, type: 'outbid', channel: 'INAPP', title: 'Outbid Alert', body: `Someone just bid ${bidAmount.toFixed(2)} ETB. Check the app!`, metadata: { auction_id: auctionId, bid_amount: bidAmount } });
  }

  async sendAuctionStarted(productName: string, auctionId: string): Promise<void> {
    this.logger.log(`[AUCTION STARTED] ${productName}`);
  }

  async sendAuctionEndingSoon(userIds: string[], auctionId: string, productName: string): Promise<void> {
    const payload = { title: 'Auction Ending Soon', body: `${productName} auction ends in 5 minutes! Place your bid now.`, data: { auction_id: auctionId, type: 'ending_soon' } };
    await Promise.allSettled(userIds.map((uid) => this.sendPush(uid, payload)));
    for (const uid of userIds) {
      await this.persistNotification({ user_id: uid, auction_id: auctionId, type: 'ending_soon', channel: 'INAPP', title: payload.title, body: payload.body, metadata: { auction_id: auctionId, product_name: productName } });
    }
  }

  async sendYouWon(userId: string, auctionId: string, productName: string, paymentDeadline?: string): Promise<void> {
    const deadlineText = paymentDeadline ? ` Payment due by ${new Date(paymentDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.` : '';
    await this.sendPush(userId, { title: 'You Won!', body: `Congratulations! You won the ${productName} auction.${deadlineText}`, data: { auction_id: auctionId, type: 'won', payment_deadline: paymentDeadline || '' } });
  }

  async sendToRole(
    role: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    persistType?: string,
    auctionId?: string,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({ where: { role: role as any }, select: { id: true } });
    const payload: PushPayload = { title, body, data: data || {} };
    await Promise.allSettled(users.map((u) => this.sendPush(u.id, payload)));
    if (persistType) {
      await Promise.allSettled(
        users.map((u) =>
          this.persistNotification({
            user_id: u.id,
            auction_id: auctionId || null,
            type: persistType,
            channel: 'INAPP',
            title,
            body,
            metadata: data || {},
          }).catch((e) => this.logger.warn(`Failed to persist notification for ${u.id}: ${e.message}`)),
        ),
      );
    }
  }

  async sendForcedClosure(productName: string, auctionId: string, totalBids: number): Promise<void> {
    const title = 'Auction Closed — No Unique Bids';
    const body = `Auction "${productName}" was closed by admin with no unique bids among ${totalBids} total bids.`;
    await this.sendToRole('user', title, body, { auction_id: auctionId, type: 'forced_closure' });
    await this.persistNotification({ user_id: '', auction_id: auctionId, type: 'forced_closure', channel: 'INAPP', title, body: `Auction closed by admin with no unique bids.`, metadata: { auction_id: auctionId, total_bids: totalBids } });
  }

  async sendFairPlayExtension(productName: string, auctionId: string, totalBids: number, extensions: number): Promise<void> {
    const title = 'Auction Extended for Fair Play';
    const body = `No unique bids among ${totalBids} bids for "${productName}". Auction extended by 24 hours (extension #${extensions}) for fair play. Place your bid now!`;
    await this.sendToRole('user', title, body, { auction_id: auctionId, type: 'fair_play_extension', extensions: String(extensions) });
    await this.persistNotification({ user_id: '', auction_id: auctionId, type: 'fair_play_extension', channel: 'INAPP', title, body: `No unique bids among ${totalBids} bids. Auction extended by 24 hours for fair play.`, metadata: { auction_id: auctionId, total_bids: totalBids, extensions } });
  }
}