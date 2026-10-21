import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  }

  async onModuleInit() {
    await this.$connect();
    await this.ensureSchema();
  }

  async ensureSchema() {
    try {
      await this.$executeRawUnsafe(`
        -- products
        ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(80) DEFAULT 'Electronics';
        ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'APPROVED';
        ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by UUID;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

        -- auctions
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS extensions INT DEFAULT 0;
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS last_payment_update TIMESTAMP;
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS public_code VARCHAR(5);
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS bid_fee DECIMAL(12, 2) DEFAULT 0;
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS second_winner_assigned BOOLEAN DEFAULT FALSE;
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS payment_deadline_hours INT DEFAULT 720;
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS escalation_rule VARCHAR(50) DEFAULT 'LOWEST_UNIQUE_BID';
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS min_bid DECIMAL(12, 2);
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS max_bid DECIMAL(12, 2);
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS num_winners INT DEFAULT 1;
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING';
        ALTER TABLE auctions ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP;

        -- bids
        ALTER TABLE bids ADD COLUMN IF NOT EXISTS encrypted_amount VARCHAR(255);
        ALTER TABLE bids ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50);

        -- disputes
        CREATE TABLE IF NOT EXISTS disputes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            auction_id UUID,
            type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
            description TEXT NOT NULL DEFAULT '',
            status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
            resolution TEXT,
            resolved_by UUID,
            document_urls TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes (user_id);
        CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
        CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes (created_at);

        -- audit_logs performance index
        CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
      `);
      this.logger.log('Schema columns and tables verified successfully');
    } catch (err: unknown) {
      this.logger.warn(`Could not verify/update schema columns: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}