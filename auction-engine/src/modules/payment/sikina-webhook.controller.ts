import { Controller, Post, HttpCode, Req, Res, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { SikinaService } from "./sikina.service";
import { PaymentService } from "./payment.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("payments-webhooks")
@Controller("payments")
export class SikinaWebhookController {
  private readonly logger = new Logger(SikinaWebhookController.name);

  constructor(
    private readonly sikinaService: SikinaService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post("webhook/sikina")
  @HttpCode(200)
  @ApiOperation({ summary: "Handle SikinaPay webhook" })
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const signature = req.headers["sikinapay-signature"] as string;
    const rawBody = (req as any).rawBody;

    if (!signature || !rawBody) {
      this.logger.warn("Webhook missing signature or raw body");
      res.status(400).json({ error: "Missing signature or body" });
      return;
    }

    const isValid = this.sikinaService.verifyWebhookSignature(
      rawBody,
      signature,
    );
    if (!isValid) {
      this.logger.warn("Webhook signature verification failed");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      this.logger.warn("Webhook invalid JSON body");
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }

    const eventType = payload.eventType as string;
    const clientReferenceId = payload.clientReferenceId as string;
    const paymentReferenceId = payload.paymentReferenceId as string;

    this.logger.log(`Webhook received: ${eventType} for ${clientReferenceId}`);

    try {
      switch (eventType) {
        case "payment.successful":
          await this.paymentService.handleSuccessfulPayment(
            clientReferenceId,
            paymentReferenceId,
            payload,
          );
          break;

        case "payment.failed":
          await this.paymentService.handleFailedPayment(
            clientReferenceId,
            payload,
          );
          break;

        case "payment.expired":
          await this.paymentService.handleExpiredPaymentLink(
            clientReferenceId,
            payload,
          );
          break;

        case "payment.cancelled":
          await this.paymentService.handleCancelledPayment(
            clientReferenceId,
            payload,
          );
          break;

        default:
          this.logger.debug(`Unhandled webhook event: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `Webhook processing failed for ${eventType}: ${error.message}`,
      );
      res.status(500).json({ error: "Webhook processing failed" });
      return;
    }

    res.json({ received: true });
  }
}
