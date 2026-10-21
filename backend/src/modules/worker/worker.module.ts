import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullMqWorker } from "./bullmq.worker";
import { NotificationDispatchService } from "./notification-dispatch.service";
import { NotificationProcessor } from "./notification.processor";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "incoming-bids",
    }),
    BullModule.registerQueue({
      name: "notifications",
    }),
    TypeOrmModule.forFeature([]),
  ],
  providers: [BullMqWorker, NotificationDispatchService, NotificationProcessor],
  exports: [BullMqWorker, NotificationDispatchService],
})
export class WorkerModule {}
