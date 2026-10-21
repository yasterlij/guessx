import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { NotificationJobData } from "./notification-dispatch.service";

@Injectable()
@Processor("notifications")
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    const identityBase =
      process.env.IDENTITY_SERVICE_URL || "http://identity-service:3000";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const internalApiKey = process.env.INTERNAL_API_KEY || "";
    if (internalApiKey) {
      headers["x-internal-api-key"] = internalApiKey;
    }

    const response = await fetch(`${identityBase}${job.data.path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(job.data.payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      this.logger.warn(
        `Notification dispatch failed: ${job.data.path} ${response.status} ${body}`,
      );
      throw new Error(
        `Notification dispatch failed with status ${response.status}`,
      );
    }
  }
}
