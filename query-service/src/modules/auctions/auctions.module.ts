import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { BidEncryptionService } from '../common/bid-encryption.service';
import { AuditModule } from '../common/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AuctionsController],
  providers: [AuctionsService, BidEncryptionService],
})
export class AuctionsModule {}
