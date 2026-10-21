import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";

export interface AwashPaymentRequest {
  amount: number;
  clientReferenceId: string;
  description: string;
  customerPhone?: string;
  customerName?: string;
  redirectSuccessUrl?: string;
  redirectFailUrl?: string;
}

export interface AwashPaymentResponse {
  responseCode: string;
  responseMessage: string;
  paymentUrl: string;
  transactionId: string;
}

export interface AwashWebhookPayload {
  eventId: string;
  eventType: string;
  createdAt: string;
  transactionId: string;
  clientReferenceId: string;
  amount: number;
  currency: string;
  status: string;
  data: Record<string, any>;
}

@Injectable()
export class AwashService {
  private readonly logger = new Logger(AwashService.name);
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>("app.awashBaseUrl")!;
    this.merchantId = this.configService.get<string>("app.awashMerchantId")!;
    this.secretKey = this.configService.get<string>("app.awashSecretKey")!;
    this.webhookSecret = this.configService.get<string>(
      "app.awashWebhookSecret",
    )!;
  }

  async generatePaymentLink(
    params: AwashPaymentRequest,
  ): Promise<AwashPaymentResponse> {
    const url = `${this.baseUrl}/api/v1/payments/generate`;

    const body: Record<string, any> = {
      merchantId: this.merchantId,
      amount: params.amount,
      clientReferenceId: params.clientReferenceId,
      description: params.description,
      currency: "ETB",
      redirectSuccessUrl: params.redirectSuccessUrl,
      redirectFailUrl: params.redirectFailUrl,
    };

    if (params.customerPhone) body.customerPhone = params.customerPhone;
    if (params.customerName) body.customerName = params.customerName;

    this.logger.log(
      `Awash payment request: ${JSON.stringify({ ...body, merchantId: this.merchantId })}`,
    );

    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `Awash generatePaymentLink failed: ${res.status} ${text}`,
      );
      throw new ServiceUnavailableException(
        `Awash payment link creation failed: ${res.status} ${text.slice(0, 200)}`,
      );
    }

    return res.json();
  }

  async getPaymentStatus(clientReferenceId: string): Promise<string> {
    const url = `${this.baseUrl}/api/v1/payments/status`;

    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ merchantId: this.merchantId, clientReferenceId }),
    });

    if (!res.ok) {
      this.logger.error(`Awash getPaymentStatus failed: ${res.status}`);
      return "PENDING";
    }

    const data = await res.json();
    return data.status || "PENDING";
  }

  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    toleranceSeconds = 300,
  ): boolean {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((kv) => kv.split("=")),
    );
    const t = Number(parts.t);
    const v1 = parts.v1;

    if (!t || !v1) return false;
    if (Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false;

    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${t}.${rawBody}`)
      .digest("hex");

    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
      "X-Merchant-Id": this.merchantId,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
  }
}
