import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaRepository } from "./prisma-repository";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.ensureSchema();
  }

  async ensureSchema() {
    try {
      await this.$executeRawUnsafe(`
        -- users
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_hash VARCHAR(60);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_attempts INT DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_accepted BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_accepted_at TIMESTAMP NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_version VARCHAR(20);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id UUID;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS section_id UUID;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS apns_token VARCHAR(255);

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
      `);
      this.logger.log("Database schema columns verified/updated successfully");
    } catch (err: unknown) {
      this.logger.warn(
        `Could not verify/update schema columns: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  repository<T extends keyof PrismaClient>(model: T): PrismaRepository<T> {
    return new PrismaRepository(this, model);
  }
}
