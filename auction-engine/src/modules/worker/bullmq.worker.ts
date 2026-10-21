import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
@Processor("incoming-bids")
export class BullMqWorker extends WorkerHost {
  private readonly logger = new Logger(BullMqWorker.name);

  async process(job: Job<any, any, string>): Promise<any> {
    return { processed: true };
  }

  async flushAuction(auctionId: string): Promise<void> {
    return;
  }
}
