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
import { AdminStatsController } from "./admin-stats.controller";
import { AdminStatsService } from "./admin-stats.service";
import { SettlementService } from "./settlement.service";
import { SettlementController } from "./settlement.controller";
import { WinnerManagementService } from "./winner-management.service";
import { WinnerManagementController } from "./winner-management.controller";
import { AdminTransactionsService } from "./admin-transactions.service";
import { AdminTransactionsController } from "./admin-transactions.controller";
import { SettlementConfigService } from "./settlement-config.service";
import { ComplianceReportService } from "./compliance-report.service";
import { AdminUsersController, AuditController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AuditModule } from "../audit/audit.module";
import { PermissionsGuard } from "../common/permissions.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Winner, Product, Bid]),
    WinnerModule,
    AuditModule,
  ],
  controllers: [
    AuctionManageController,
    ProductApprovalController,
    AdminStatsController,
    SettlementController,
    WinnerManagementController,
    AdminTransactionsController,
    AdminUsersController,
    AuditController,
  ],
  providers: [
    AuctionAdminService,
    AuctionReviewService,
    ProductAdminService,
    ImageService,
    BidEncryptionService,
    AdminStatsService,
    SettlementService,
    WinnerManagementService,
    AdminTransactionsService,
    SettlementConfigService,
    ComplianceReportService,
    AdminUsersService,
    PermissionsGuard,
  ],
  exports: [SettlementConfigService, PermissionsGuard, AdminUsersService],
})
export class AdminModule {}
