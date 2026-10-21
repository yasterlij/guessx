import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import * as crypto from "node:crypto";
import { AwashService } from "./awash.service";
import {
  PaymentGateway,
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentType,
} from "./entities/payment-transaction.entity";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { In } from "typeorm";

const WINNING_PAYMENT_TYPES = [PaymentType.WINNING_BID, PaymentType.WALLET];

@Injectable()
export class PaymentLinkService {
  private readonly logger = new Logger(PaymentLinkService.name);
  private readonly successRedirectUrl: string;
  private readonly failedRedirectUrl: string;
  private readonly proxySecret: string;

  constructor(
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    private awashService: AwashService,
    private configService: ConfigService,
    private bidEncryptionService: BidEncryptionService,
  ) {
    this.successRedirectUrl =
      this.configService.get<string>("app.awashSuccessRedirectUrl") ||
      `${this.configService.get<string>("app.appBaseUrl")!}/payment/success`;
    this.failedRedirectUrl =
      this.configService.get<string>("app.awashFailedRedirectUrl") ||
      `${this.configService.get<string>("app.appBaseUrl")!}/payment/failed`;
    this.proxySecret =
      this.configService.get<string>("app.jwtSecret")! ||
      "default-proxy-secret";
  }

  generateProxyUrl(transactionId: string): string {
    const expiresAt = Math.floor(Date.now() / 1000) + 600;
    const payload = `${transactionId}:${expiresAt}`;
    const hmac = crypto
      .createHmac("sha256", this.proxySecret)
      .update(payload)
      .digest("hex");
    const token = Buffer.from(`${hmac}.${expiresAt}`).toString("base64url");
    return `/api/v1/payments/proxy/${transactionId}?token=${token}`;
  }

  validateProxyToken(transactionId: string, token: string): boolean {
    try {
      const decoded = Buffer.from(token, "base64url").toString();
      const [hmac, expiresAtStr] = decoded.split(".");
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Math.floor(Date.now() / 1000) > expiresAt) return false;
      const payload = `${transactionId}:${expiresAtStr}`;
      const expected = crypto
        .createHmac("sha256", this.proxySecret)
        .update(payload)
        .digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(hmac, "hex"),
        Buffer.from(expected, "hex"),
      );
    } catch {
      return false;
    }
  }

  async fetchAndProxyPaymentPage(
    paymentUrl: string,
  ): Promise<{ body: string; contentType: string }> {
    const res = await fetch(paymentUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    let body = await res.text();
    const contentType =
      res.headers.get("content-type") || "text/html;charset=UTF-8";

    if (contentType.includes("text/html")) {
      const origin = new URL(paymentUrl).origin;
      const baseTag = `<base href="${origin}">`;
      if (/<head[^>]*>/i.test(body)) {
        body = body.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`);
      } else {
        body = `<head>${baseTag}</head>${body}`;
      }
    }

    return { body, contentType };
  }

  async createPaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    description: string,
    paymentMethod: "AWASH" = "AWASH",
    customerPhone?: string,
  ): Promise<{ paymentUrl: string; proxyUrl: string; transactionId: string }> {
    const shortAuctionId = auctionId.split("-")[0];
    const clientReferenceId = `pay-${shortAuctionId}-${Date.now()}`;

    const existing = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.WINNING_BID,
        status: PaymentTransactionStatus.PENDING,
      },
    });
    if (existing?.awash_payment_url) {
      const paymentUrl = existing.awash_payment_url;
      const proxyUrl = this.generateProxyUrl(existing.id);
      return { paymentUrl, proxyUrl, transactionId: existing.id };
    }

    const awashResponse = await this.awashService.generatePaymentLink({
      amount,
      clientReferenceId,
      description,
      customerPhone,
      redirectSuccessUrl: this.successRedirectUrl,
      redirectFailUrl: this.failedRedirectUrl,
    });
    const paymentUrl = awashResponse.paymentUrl;
    const gateway = PaymentGateway.AWASH;

    const encryptedAmount = this.bidEncryptionService.encrypt(amount);

    const transaction = this.paymentTransactionRepository.create({
      auction_id: auctionId,
      user_id: userId,
      amount,
      encrypted_amount: encryptedAmount,
      client_reference_id: clientReferenceId,
      payment_type: PaymentType.WINNING_BID,
      status: PaymentTransactionStatus.PENDING,
      currency: "ETB",
      gateway,
      customer_phone: customerPhone,
      awash_payment_url: paymentUrl,
    });
    const saved = await this.paymentTransactionRepository.save(transaction);

    this.logger.log(
      `Payment link created for auction ${auctionId}, user ${userId} via ${gateway}: ${paymentUrl}`,
    );

    const proxyUrl = this.generateProxyUrl(saved.id);
    return { paymentUrl, proxyUrl, transactionId: saved.id };
  }

  async findTransaction(
    auctionId: string,
    userId: string,
  ): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: In(WINNING_PAYMENT_TYPES),
      },
      order: { created_at: "DESC" },
    });
  }

  async findTransactionById(
    transactionId: string,
  ): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findOne({
      where: { id: transactionId },
    });
  }

  async createBidFeePaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    paymentMethod: "AWASH" = "AWASH",
  ): Promise<{ paymentUrl: string; proxyUrl: string; transactionId: string }> {
    const shortAuctionId = auctionId.split("-")[0];
    const clientReferenceId = `fee-${shortAuctionId}-${userId.split("-")[0]}-${Date.now()}`;
    const description = `Bid fee for auction ${auctionId}`;

    const existing = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.PENDING,
      },
    });
    if (existing?.awash_payment_url) {
      const paymentUrl = existing.awash_payment_url;
      const proxyUrl = this.generateProxyUrl(existing.id);
      return { paymentUrl, proxyUrl, transactionId: existing.id };
    }

    const awashResponse = await this.awashService.generatePaymentLink({
      amount,
      clientReferenceId,
      description,
      redirectSuccessUrl: this.successRedirectUrl,
      redirectFailUrl: this.failedRedirectUrl,
    });
    const paymentUrl = awashResponse.paymentUrl;
    const gateway = PaymentGateway.AWASH;

    const transaction = this.paymentTransactionRepository.create({
      auction_id: auctionId,
      user_id: userId,
      amount,
      client_reference_id: clientReferenceId,
      awash_payment_url: paymentUrl,
      status: PaymentTransactionStatus.PENDING,
      currency: "ETB",
      payment_type: PaymentType.BID_FEE,
      gateway,
    });
    const saved = await this.paymentTransactionRepository.save(transaction);

    this.logger.log(
      `Bid fee payment link created for auction ${auctionId}, user ${userId} via ${gateway}: ${paymentUrl}`,
    );

    const proxyUrl = this.generateProxyUrl(saved.id);
    return { paymentUrl, proxyUrl, transactionId: saved.id };
  }
}
