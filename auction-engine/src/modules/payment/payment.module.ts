import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { PaymentController } from "./payment.controller";
import { PaymentLinkService } from "./payment-link.service";
import { PaymentService } from "./payment.service";
import { SikinaService } from "./sikina.service";
import { AwashService } from "./awash.service";
import { SikinaWebhookController } from "./sikina-webhook.controller";
import { AwashWebhookController } from "./awash-webhook.controller";
import { Auction } from "../winner/entities/auction.entity";
import { Winner } from "../winner/entities/winner.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { PaymentTransaction } from "./entities/payment-transaction.entity";
import { WinnerModule } from "../winner/winner.module";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { WorkerModule } from "../worker/worker.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Winner, Bid, PaymentTransaction]),
    WinnerModule,
    WorkerModule,
    ConfigModule,
  ],
  controllers: [
    PaymentController,
    SikinaWebhookController,
    AwashWebhookController,
  ],
  providers: [
    PaymentLinkService,
    PaymentService,
    SikinaService,
    AwashService,
    BidEncryptionService,
  ],
  exports: [PaymentService, SikinaService, AwashService],
})
export class PaymentModule {}
