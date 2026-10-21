import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuctionAdminService } from "./auction-admin.service";
import { AuctionManageController } from "./auction-manage.controller";
import { ProductApprovalController } from "./product-approval.controller";
import { AuctionReviewService } from "./auction-review.service";
import { ImageService } from "./image.service";
import { ProductAdminService } from "./product-admin.service";
import { Auction } from "../winner/entities/auction.entity";
import { Winner } from "../winner/entities/winner.entity";
import { Product } from "./entities/product.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { WinnerModule } from "../winner/winner.module";
import { BidEncryptionService } from "../common/bid-encryption.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Winner, Product, Bid]),
    WinnerModule,
  ],
  controllers: [AuctionManageController, ProductApprovalController],
  providers: [
    AuctionAdminService,
    AuctionReviewService,
    ProductAdminService,
    ImageService,
    BidEncryptionService,
  ],
})
export class AdminModule {}
