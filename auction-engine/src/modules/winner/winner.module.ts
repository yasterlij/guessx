import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule } from "@nestjs/schedule";
import { WinnerService } from "./winner.service";
import { AuctionClosureService } from "./auction-closure.service";
import { AuctionClosureEventsService } from "./auction-closure-events.service";
import { AuctionNotificationService } from "./auction-notification.service";
import { Auction } from "./entities/auction.entity";
import { Winner } from "./entities/winner.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { WorkerModule } from "../worker/worker.module";
import { BidEncryptionService } from "../common/bid-encryption.service";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Auction, Bid, Winner]),
    WorkerModule,
  ],
  providers: [
    WinnerService,
    AuctionClosureService,
    AuctionClosureEventsService,
    AuctionNotificationService,
    BidEncryptionService,
  ],
  exports: [WinnerService, AuctionClosureService],
})
export class WinnerModule {}
