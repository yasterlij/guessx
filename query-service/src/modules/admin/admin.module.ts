import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';
import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';
import { WinnerManagementService } from './winner-management.service';
import { WinnerManagementController } from './winner-management.controller';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminTransactionsController } from './admin-transactions.controller';
import { SettlementConfigService } from './settlement-config.service';
import { ComplianceReportService } from './compliance-report.service';

@Module({
  controllers: [
    AdminController,
    SettlementController,
    WinnerManagementController,
    AdminTransactionsController,
  ],
  providers: [
    AdminStatsService,
    SettlementService,
    WinnerManagementService,
    AdminTransactionsService,
    SettlementConfigService,
    ComplianceReportService,
  ],
  exports: [SettlementConfigService],
})
export class AdminModule {}

