import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BiddingController } from "./bidding.controller";
import { BiddingService } from "./bidding.service";
import { Bid } from "./entities/bid.entity";
import { Auction } from "../winner/entities/auction.entity";
import { Winner } from "../winner/entities/winner.entity";
import { AuctionGateway } from "./gateway/auction.gateway";
import { BiddingWindowInterceptor } from "../common/bidding-window.interceptor";
import { ThrottleGuard } from "../common/throttle.guard";
import { NonceGuard } from "../common/nonce.guard";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { WinnerModule } from "../winner/winner.module";
import { PaymentTransaction } from "../payment/entities/payment-transaction.entity";
import { WorkerModule } from "../worker/worker.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Bid, Auction, Winner, PaymentTransaction]),
    BullModule.registerQueue({ name: "incoming-bids" }),
    WinnerModule,
    WorkerModule,
  ],
  controllers: [BiddingController],
  providers: [
    BiddingService,
    AuctionGateway,
    BiddingWindowInterceptor,
    ThrottleGuard,
    NonceGuard,
    BidEncryptionService,
  ],
  exports: [BiddingService, AuctionGateway, BidEncryptionService],
})
export class BiddingModule {}
