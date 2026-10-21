import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "node:crypto";

export interface SikinaPayLinkParams {
  amount: number;
  clientReferenceId: string;
  description: string;
  paymentSuccessfulRedirectUrl?: string;
  paymentFailedRedirectUrl?: string;
  language?: string;
}

export interface SikinaPayLinkResponse {
  responseCode: string;
  responseStatus: string;
  responseMessage: string;
  paymentUrl: string;
  currentDate: string;
  currentTime: string;
}

export interface SikinaPayStatusParams {
  clientReferenceId: string;
  transactionDate: string;
}

export interface SikinaWebhookPayload {
  eventId: string;
  eventType: string;
  createdAt: string;
  paymentReferenceId: string;
  clientReferenceId: string;
  amount: number;
  currency: string;
  data: Record<string, any>;
}

@Injectable()
export class SikinaService {
  private readonly logger = new Logger(SikinaService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>("app.sikinaBaseUrl")!;
    this.secretKey = this.configService.get<string>("app.sikinaSecretKey")!;
    this.webhookSecret = this.configService.get<string>(
      "app.sikinaWebhookSecret",
    )!;
  }

  async generatePaymentLink(
    params: SikinaPayLinkParams,
  ): Promise<SikinaPayLinkResponse> {
    const url = `${this.baseUrl}/api/v1/gateway/generatePaymentLink`;

    const body: Record<string, any> = {
      amount: params.amount,
      clientReferenceId: params.clientReferenceId,
      description: params.description,
    };

    if (params.paymentSuccessfulRedirectUrl) {
      body.paymentSuccessfulRedirectUrl = params.paymentSuccessfulRedirectUrl;
    }
    if (params.paymentFailedRedirectUrl) {
      body.paymentFailedRedirectUrl = params.paymentFailedRedirectUrl;
    }
    if (params.language) {
      body.language = params.language;
    }

    this.logger.log(`SikinaPay request: ${JSON.stringify(body)}`);

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
    } catch {
      this.logger.error("SikinaPay generatePaymentLink: network unreachable");
      throw new ServiceUnavailableException(
        "SikinaPay service is currently unavailable",
      );
    }

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `SikinaPay generatePaymentLink failed: ${res.status} ${text}`,
      );
      throw new ServiceUnavailableException(
        `SikinaPay payment link creation failed: ${res.status} ${text.slice(0, 200)}`,
      );
    }

    return res.json();
  }

  async getPaymentStatus(
    clientReferenceId: string,
    transactionDate: string,
  ): Promise<string> {
    const url = `${this.baseUrl}/api/v1/gateway/getPaymentStatus`;

    this.logger.log(`Fetching ${url} for ${clientReferenceId}`);

    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ clientReferenceId, transactionDate }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      this.logger.error(
        `SikinaPay getPaymentStatus failed: ${res.status} ${text.slice(0, 200)}`,
      );
      return "PENDING";
    }

    const data = await res.json();
    this.logger.log(
      `SikinaPay getPaymentStatus response: ${JSON.stringify(data)}`,
    );
    const rawStatus = data.status || data.responseMessage || "PENDING";
    return rawStatus.toUpperCase();
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
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
  }
}
