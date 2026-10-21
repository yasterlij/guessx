-- ==============================================================================
-- GuessX / TakeLow Complete PostgreSQL Database Initialization Script
-- DBMS: PostgreSQL 14+
-- Consolidated from migrations: 000 through 041
-- Compatible with: psql, pgAdmin, DBeaver, Supabase, Neon, AWS RDS, Docker Postgres
-- Generated: 2026-10-21T23:25:37.313Z
-- ==============================================================================

-- 1. Create Migration Tracking Table
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Safe Citus extension loading (smoothly skipped if not running a distributed Citus cluster)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS citus;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Citus extension is not installed; running in standard PostgreSQL mode.';
END $$;


-- ==============================================================================
-- Migration: 000-create-extension-citus.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS citus;

INSERT INTO schema_migrations (filename) VALUES ('000-create-extension-citus.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 001-create-users.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    wallet_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    full_name VARCHAR(255),
    avatar_url VARCHAR(255),
    hashed_refresh_token VARCHAR(255),
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    provider_id VARCHAR(255),
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users (phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

INSERT INTO schema_migrations (filename) VALUES ('001-create-users.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 002-create-products.sql
-- ==============================================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_urls JSONB,
    current_market_price DECIMAL(12, 2) NOT NULL,
    brand VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_name ON products (name);

INSERT INTO schema_migrations (filename) VALUES ('002-create-products.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 003-create-auctions.sql
-- ==============================================================================

CREATE TYPE auction_status AS ENUM ('ACTIVE', 'CLOSED', 'EXPIRED');

CREATE TABLE auctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status auction_status NOT NULL DEFAULT 'ACTIVE',
    winner_user_id UUID REFERENCES users(id),
    winning_bid_amount DECIMAL(12,2),
    min_bid DECIMAL(12,2),
    max_bid DECIMAL(12,2),
    num_winners INT DEFAULT 1,
    payment_status VARCHAR(20),
    payment_deadline TIMESTAMP,
    last_payment_update TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auctions_status ON auctions (status);
CREATE INDEX idx_auctions_end_time ON auctions (end_time);
CREATE INDEX idx_auctions_product_id ON auctions (product_id);

INSERT INTO schema_migrations (filename) VALUES ('003-create-auctions.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 004-create-bids.sql
-- ==============================================================================

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    bid_time TIMESTAMP NOT NULL DEFAULT NOW(),
    service_fee_paid BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_bids_user_id ON bids (user_id);
CREATE INDEX idx_bids_auction_id ON bids (auction_id);
CREATE INDEX idx_bids_bid_time ON bids (bid_time);

INSERT INTO schema_migrations (filename) VALUES ('004-create-bids.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 005-create-transactions.sql
-- ==============================================================================

CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'BID_FEE', 'REFUND');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    type transaction_type NOT NULL,
    reference_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions (user_id);
CREATE INDEX idx_transactions_reference_id ON transactions (reference_id);
CREATE INDEX idx_transactions_created_at ON transactions (created_at);

INSERT INTO schema_migrations (filename) VALUES ('005-create-transactions.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 006-create-favorites.sql
-- ==============================================================================

CREATE TABLE favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, auction_id)
);

CREATE INDEX idx_favorites_user_id ON favorites (user_id);

INSERT INTO schema_migrations (filename) VALUES ('006-create-favorites.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 007-partition-bids.sql
-- ==============================================================================

CREATE TABLE bids_partitioned (
    id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    bid_time TIMESTAMP NOT NULL DEFAULT NOW(),
    service_fee_paid BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id, bid_time)
) PARTITION BY RANGE (bid_time);

CREATE TABLE bids_2026_q3 PARTITION OF bids_partitioned FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE INDEX CONCURRENTLY idx_bids_auction_active ON bids (auction_id, amount);

INSERT INTO schema_migrations (filename) VALUES ('007-partition-bids.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 008-citus-distribution.sql
-- ==============================================================================

-- Citus distribution skipped for local development.
-- Tables remain local; all FK constraints and unique constraints work normally.
-- For distributed production, apply Citus distribution separately per the Citus documentation.

INSERT INTO schema_migrations (filename) VALUES ('008-citus-distribution.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 009-create-otps.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_phone_number ON otps (phone_number);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps (expires_at);

-- Register otps as a Citus reference table (replicated to all nodes).
-- Idempotent: skips if Citus is absent or otps is already a reference table.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'citus')
     AND NOT EXISTS (SELECT 1 FROM citus_tables WHERE table_name = 'otps'::regclass) THEN
    PERFORM create_reference_table('otps');
  END IF;
END $$;

INSERT INTO schema_migrations (filename) VALUES ('009-create-otps.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 010-fix-bids-index.sql
-- ==============================================================================

DROP INDEX IF EXISTS idx_bids_auction_active;

CREATE INDEX CONCURRENTLY idx_bids_auction_amount ON bids (auction_id, amount);

CREATE INDEX CONCURRENTLY idx_bids_auction_lookup ON bids (auction_id, bid_time, amount);

INSERT INTO schema_migrations (filename) VALUES ('010-fix-bids-index.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 011-create-auctions-partial-index.sql
-- ==============================================================================

CREATE INDEX CONCURRENTLY idx_auctions_active_lookup
ON auctions (end_time, id)
WHERE status = 'ACTIVE';

INSERT INTO schema_migrations (filename) VALUES ('011-create-auctions-partial-index.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 012-add-remaining-indexes.sql
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions (status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions (end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_product_id ON auctions (product_id);
CREATE INDEX IF NOT EXISTS idx_auctions_winner ON auctions (winner_user_id) WHERE winner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids (user_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids (auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bid_time ON bids (bid_time);
CREATE INDEX IF NOT EXISTS idx_bids_user_auction ON bids (user_id, auction_id, amount);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions (reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_auction_id ON favorites (auction_id);

INSERT INTO schema_migrations (filename) VALUES ('012-add-remaining-indexes.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 013-add-push-tokens.sql
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS apns_token VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users (fcm_token);

INSERT INTO schema_migrations (filename) VALUES ('013-add-push-tokens.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 014-add-favorites-created-at.sql
-- ==============================================================================

-- Add missing created_at column to favorites table
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites (created_at);

INSERT INTO schema_migrations (filename) VALUES ('014-add-favorites-created-at.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 015-add-user-role.sql
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

INSERT INTO schema_migrations (filename) VALUES ('015-add-user-role.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 016-add-decimal-to-bids-auctions.sql
-- ==============================================================================

ALTER TABLE bids ALTER COLUMN amount TYPE DECIMAL(12,2);
ALTER TABLE bids ALTER COLUMN amount SET NOT NULL;

ALTER TABLE auctions ALTER COLUMN winning_bid_amount TYPE DECIMAL(12,2) USING winning_bid_amount::DECIMAL(12,2);

-- Add missing auction columns
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS min_bid DECIMAL(12,2);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS max_bid DECIMAL(12,2);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS num_winners INT DEFAULT 1;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP;

INSERT INTO schema_migrations (filename) VALUES ('016-add-decimal-to-bids-auctions.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 017-add-wallet-pin.sql
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_hash VARCHAR(60);

-- Ensure existing users can still use the app without a PIN
-- They will be prompted to set one on their first payment

INSERT INTO schema_migrations (filename) VALUES ('017-add-wallet-pin.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 018-add-pin-attempts.sql
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP;

INSERT INTO schema_migrations (filename) VALUES ('018-add-pin-attempts.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 020-create-payment-transactions.sql
-- ==============================================================================

CREATE TYPE payment_transaction_status AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'EXPIRED', 'CANCELLED', 'REVOKED');
CREATE TYPE payment_type AS ENUM ('BID_FEE', 'WINNING_BID', 'WALLET');
CREATE TYPE payment_gateway AS ENUM ('SIKINAPAY', 'AWASH');

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    client_reference_id VARCHAR(128) NOT NULL UNIQUE,
    sikina_payment_reference_id VARCHAR(255),
    sikina_payment_url VARCHAR,
    awash_payment_url VARCHAR,
    awash_transaction_id VARCHAR(255),
    gateway payment_gateway NOT NULL DEFAULT 'SIKINAPAY',
    customer_phone VARCHAR(50),
    status payment_transaction_status NOT NULL DEFAULT 'PENDING',
    currency VARCHAR,
    webhook_payload JSONB,
    payment_type payment_type NOT NULL DEFAULT 'WINNING_BID',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_auction_id ON payment_transactions (auction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_reference_id ON payment_transactions (client_reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions (status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions (gateway);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_awash_transaction_id ON payment_transactions (awash_transaction_id);

INSERT INTO schema_migrations (filename) VALUES ('020-create-payment-transactions.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 021-create-winners-table.sql
-- ==============================================================================

CREATE TABLE winners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    rank INT NOT NULL DEFAULT 1,
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    payment_deadline TIMESTAMP,
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_winner_auction_amount UNIQUE (auction_id, amount),
    CONSTRAINT uq_winner_auction_rank UNIQUE (auction_id, rank)
);

CREATE INDEX idx_winners_auction_id ON winners(auction_id);
CREATE INDEX idx_winners_user_id ON winners(user_id);
CREATE INDEX idx_winners_payment_status ON winners(payment_status);

CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auction_id UUID REFERENCES auctions(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'PUSH',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB,
    read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_type ON notification_logs(type);
CREATE INDEX idx_notification_logs_read ON notification_logs(user_id, read);

INSERT INTO schema_migrations (filename) VALUES ('021-create-winners-table.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 022-add-last-payment-update.sql
-- ==============================================================================

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS last_payment_update TIMESTAMP;

INSERT INTO schema_migrations (filename) VALUES ('022-add-last-payment-update.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 023-add-ticket-to-bids.sql
-- ==============================================================================

ALTER TABLE bids ADD COLUMN IF NOT EXISTS ticket_number VARCHAR NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_bids_ticket_number ON bids (ticket_number);

INSERT INTO schema_migrations (filename) VALUES ('023-add-ticket-to-bids.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 024-create-audit-logs.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR NOT NULL,
    actor_phone VARCHAR,
    action VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    entity_id VARCHAR NOT NULL,
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);

INSERT INTO schema_migrations (filename) VALUES ('024-create-audit-logs.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 025-add-encrypted-amount-to-bids.sql
-- ==============================================================================

ALTER TABLE bids ADD COLUMN IF NOT EXISTS encrypted_amount TEXT DEFAULT '';

INSERT INTO schema_migrations (filename) VALUES ('025-add-encrypted-amount-to-bids.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 026-add-encrypted-amount-to-payment-transactions.sql
-- ==============================================================================

ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS encrypted_amount VARCHAR(512) DEFAULT '';

INSERT INTO schema_migrations (filename) VALUES ('026-add-encrypted-amount-to-payment-transactions.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 027-add-auction-extensions.sql
-- ==============================================================================

ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS extensions INTEGER NOT NULL DEFAULT 0;

INSERT INTO schema_migrations (filename) VALUES ('027-add-auction-extensions.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 028-add-unique-constraint-to-bids.sql
-- ==============================================================================

ALTER TABLE bids ADD CONSTRAINT uq_bids_auction_user_time UNIQUE (auction_id, user_id, bid_time);

INSERT INTO schema_migrations (filename) VALUES ('028-add-unique-constraint-to-bids.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 029-cleanup-phantom-bids.sql
-- ==============================================================================

DELETE FROM bids WHERE amount = 0 AND encrypted_amount != '';

INSERT INTO schema_migrations (filename) VALUES ('029-cleanup-phantom-bids.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 030-create-user-permissions.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_permission UNIQUE (user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

INSERT INTO schema_migrations (filename) VALUES ('030-create-user-permissions.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 031-add-public-auction-codes-and-product-specs.sql
-- ==============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS specs JSONB;

CREATE SEQUENCE IF NOT EXISTS auction_public_code_seq;

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS public_code VARCHAR(5);

ALTER TABLE auctions
  ALTER COLUMN public_code SET DEFAULT LPAD(nextval('auction_public_code_seq')::text, 5, '0');

UPDATE auctions
SET public_code = LPAD(nextval('auction_public_code_seq')::text, 5, '0')
WHERE public_code IS NULL OR public_code = '';

ALTER TABLE auctions
  ALTER COLUMN public_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auctions_public_code ON auctions (public_code);

INSERT INTO schema_migrations (filename) VALUES ('031-add-public-auction-codes-and-product-specs.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 032-add-bid-fee-to-auctions.sql
-- ==============================================================================

ALTER TABLE auctions
ADD COLUMN IF NOT EXISTS bid_fee DECIMAL(12, 2) NULL;

INSERT INTO schema_migrations (filename) VALUES ('032-add-bid-fee-to-auctions.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 033-add-product-category.sql
-- ==============================================================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS category VARCHAR(80);

UPDATE products
SET category = CASE
  WHEN LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%car%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%vehicle%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%toyota%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%hyundai%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%suv%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%sedan%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%pickup%'
    THEN 'Cars'
  WHEN LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%cloth%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%fashion%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%shirt%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%dress%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%jacket%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%shoe%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%wear%'
    THEN 'Clothes'
  WHEN LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%smartphone%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%phone%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%iphone%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%galaxy%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%pixel%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%android%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%mobile%'
    THEN 'Smartphones'
  WHEN LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%tablet%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%ipad%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '% tab%'
    THEN 'Tablets'
  WHEN LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%computer%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%laptop%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%desktop%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%pc%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%macbook%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%imac%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%notebook%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%surface%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%thinkpad%'
    THEN 'Computers'
  WHEN LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%gaming%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%xbox%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%playstation%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%ps5%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%ps4%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%nintendo%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%switch%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%console%'
    THEN 'Gaming'
  WHEN LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%audio%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%speaker%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%headphone%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%earbud%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%soundbar%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%jbl%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%bose%'
    THEN 'Audio'
  WHEN LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%appliance%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%fridge%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%refrigerator%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%washer%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%dryer%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%oven%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%microwave%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%vacuum%'
    OR LOWER(COALESCE(brand, '') || ' ' || COALESCE(name, '')) LIKE '%dyson%'
    THEN 'Appliances'
  ELSE 'Electronics'
END
WHERE category IS NULL OR TRIM(category) = '';

ALTER TABLE products
ALTER COLUMN category SET DEFAULT 'Electronics';

ALTER TABLE products
ALTER COLUMN category SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

INSERT INTO schema_migrations (filename) VALUES ('033-add-product-category.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 034-citus-distribution-production.sql
-- ==============================================================================

-- Citus Distribution for Production
-- This migration configures distributed tables for horizontal scaling with Citus.
-- SAFELY SKIPS on local development (no worker nodes configured).
-- Only applies distribution on a production Citus coordinator with active worker nodes.

-- Enable Citus extension (idempotent, safe on local dev)
CREATE EXTENSION IF NOT EXISTS citus;

-- ============================================================
-- CHECK: Is this a real Citus cluster with worker nodes?
-- If no worker nodes are registered, skip all distribution commands.
-- This makes the migration safe to run on local development PostgreSQL.
-- ============================================================

DO $$
DECLARE
  worker_count INTEGER;
  is_coordinator BOOLEAN;
BEGIN
  -- Check if pg_dist_node table exists and has active workers
  BEGIN
    SELECT COUNT(*) INTO worker_count
    FROM pg_dist_node
    WHERE isactive = true AND noderole = 'primary';

    -- Check if this node is a coordinator (not a worker)
    SELECT EXISTS(
      SELECT 1 FROM pg_dist_node
      WHERE noderole = 'coordinator'
    ) INTO is_coordinator;
  EXCEPTION WHEN OTHERS THEN
    -- pg_dist_node doesn't exist or not accessible - not a Citus cluster
    worker_count := 0;
    is_coordinator := false;
  END;

  -- Only proceed with distribution if we have worker nodes
  IF worker_count > 0 AND is_coordinator THEN
    RAISE NOTICE 'Citus cluster detected with % worker nodes. Applying distribution...', worker_count;

    -- ============================================================
    -- FIX UNIQUE CONSTRAINTS BEFORE DISTRIBUTION
    -- Citus requires UNIQUE constraints to include the distribution column.
    -- ============================================================

    -- Users: drop phone_number/email unique constraints (id is the distribution column)
    BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_number_key;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users (phone_number);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

    -- Auctions: drop public_code unique constraint (id is the distribution column)
    DROP INDEX IF EXISTS idx_auctions_public_code;
    CREATE INDEX IF NOT EXISTS idx_auctions_public_code ON auctions (public_code);

    -- Payment transactions: drop client_reference_id unique constraint
    DROP INDEX IF EXISTS idx_payment_transactions_client_reference_id;
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_reference_id ON payment_transactions (client_reference_id);

    -- ============================================================
    -- REFERENCE TABLES (replicated to all nodes)
    -- ============================================================

    BEGIN
      PERFORM create_reference_table('products');
      RAISE NOTICE 'Created reference table: products';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping products (already reference or error: %)', SQLERRM;
    END;

    -- ============================================================
    -- DISTRIBUTED TABLES (sharded by distribution column)
    -- ============================================================

    BEGIN
      PERFORM create_distributed_table('users', 'id');
      RAISE NOTICE 'Distributed table: users by id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping users (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('auctions', 'id');
      RAISE NOTICE 'Distributed table: auctions by id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping auctions (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('bids', 'auction_id');
      RAISE NOTICE 'Distributed table: bids by auction_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping bids (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('bids_partitioned', 'auction_id');
      RAISE NOTICE 'Distributed table: bids_partitioned by auction_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping bids_partitioned (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('winners', 'auction_id');
      RAISE NOTICE 'Distributed table: winners by auction_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping winners (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('payment_transactions', 'auction_id');
      RAISE NOTICE 'Distributed table: payment_transactions by auction_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping payment_transactions (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('favorites', 'user_id');
      RAISE NOTICE 'Distributed table: favorites by user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping favorites (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('transactions', 'user_id');
      RAISE NOTICE 'Distributed table: transactions by user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping transactions (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('otps', 'phone_number');
      RAISE NOTICE 'Distributed table: otps by phone_number';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping otps (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('notification_logs', 'user_id');
      RAISE NOTICE 'Distributed table: notification_logs by user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping notification_logs (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('user_permissions', 'user_id');
      RAISE NOTICE 'Distributed table: user_permissions by user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping user_permissions (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('audit_logs', 'actor_id');
      RAISE NOTICE 'Distributed table: audit_logs by actor_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping audit_logs (already distributed or error: %)', SQLERRM;
    END;

    RAISE NOTICE 'Citus distribution complete!';

  ELSE
    RAISE NOTICE 'No Citus worker nodes detected (worker_count=%, is_coordinator=%). Skipping distribution - tables remain local.', worker_count, is_coordinator;
  END IF;
END $$;

-- ============================================================
-- VERIFICATION QUERIES (run after migration on production)
-- ============================================================
/*
-- Check distributed tables
SELECT * FROM citus_tables;

-- Check colocation groups
SELECT * FROM pg_dist_colocation;

-- Check shard placement
SELECT * FROM pg_dist_shard_placement;

-- Check reference tables
SELECT * FROM citus_tables WHERE table_type = 'reference';

-- Check worker nodes
SELECT * FROM pg_dist_node WHERE isactive = true;
*/

INSERT INTO schema_migrations (filename) VALUES ('034-citus-distribution-production.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 035-add-tc-acceptance.sql
-- ==============================================================================

-- Add Terms & Conditions acceptance columns to users table
-- Idempotent: uses IF NOT EXISTS so it can be re-run safely

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tc_accepted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tc_accepted_at TIMESTAMP NULL;

INSERT INTO schema_migrations (filename) VALUES ('035-add-tc-acceptance.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 036-add-product-approval.sql
-- ==============================================================================

-- Add product approval workflow columns to products table
-- Idempotent: uses IF NOT EXISTS so it can be re-run safely

ALTER TABLE products
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS approved_by UUID NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Add foreign key constraint for approved_by -> users.id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_products_approved_by'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT fk_products_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for querying pending products
CREATE INDEX IF NOT EXISTS idx_products_approval_status
ON products (approval_status);

INSERT INTO schema_migrations (filename) VALUES ('036-add-product-approval.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 037-add-tc-version.sql
-- ==============================================================================

-- Add tc_version column to users table for T&C version tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_version VARCHAR(20);

INSERT INTO schema_migrations (filename) VALUES ('037-add-tc-version.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 038-create-disputes.sql
-- ==============================================================================

-- Create disputes table for dispute resolution
CREATE TABLE IF NOT EXISTS disputes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL,
  auction_id  UUID,
  type        VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'OPEN',
  resolution  TEXT,
  resolved_by UUID,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes (user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes (created_at);

INSERT INTO schema_migrations (filename) VALUES ('038-create-disputes.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 039-rbac-role-hierarchy.sql
-- ==============================================================================

-- RBAC Role Hierarchy & Organizational Structure
-- Enterprise-grade role hierarchy modeled after Awash Bank / Awash Birr Wallet
-- Supports: CEO, CXO, Director, Manager, Expert, Specialist, Analyst

-- ============================================================
-- 1. EXTEND USER ROLE (role is VARCHAR, not enum - update existing values)
-- ============================================================

-- The role column is VARCHAR(20), so new values are automatically supported.
-- No ALTER TYPE needed. Just ensure the application recognizes the new roles.
-- New roles: CEO, CXO, DIRECTOR, MANAGER, EXPERT, SPECIALIST, ANALYST

-- ============================================================
-- 2. ORGANIZATIONAL STRUCTURE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    head_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    head_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(division_id, code)
);

CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    head_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(department_id, code)
);

-- ============================================================
-- 3. USER ORGANIZATIONAL ASSIGNMENT
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id);

-- ============================================================
-- 4. DYNAMIC PERMISSION OVERRIDES (TEMPORARY ELEVATED ACCESS)
-- ============================================================

CREATE TABLE IF NOT EXISTS permission_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES users(id),
    permissions JSONB NOT NULL,
    reason VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP,
    revoked_by UUID
);

CREATE INDEX IF NOT EXISTS idx_permission_overrides_user_id ON permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_expires_at ON permission_overrides(expires_at);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_is_active ON permission_overrides(is_active);

-- ============================================================
-- 5. ACCESS DECISION AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS access_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    granted BOOLEAN NOT NULL,
    reason VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_decisions_user_id ON access_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_access_decisions_action ON access_decisions(action);
CREATE INDEX IF NOT EXISTS idx_access_decisions_granted ON access_decisions(granted);
CREATE INDEX IF NOT EXISTS idx_access_decisions_created_at ON access_decisions(created_at);

-- ============================================================
-- 6. ROLE HIERARCHY LEVELS (for quick lookup)
-- ============================================================

CREATE TABLE IF NOT EXISTS role_hierarchy (
    role VARCHAR(20) PRIMARY KEY,
    level INTEGER NOT NULL,
    parent_role VARCHAR(20),
    description VARCHAR(200)
);

INSERT INTO role_hierarchy (role, level, parent_role, description) VALUES
    ('CEO', 1, NULL, 'Chief Executive Officer - Full system access'),
    ('CXO', 2, 'CEO', 'Chief Officer (CFO, CCO, CTO) - Division-level access'),
    ('DIRECTOR', 3, 'CXO', 'Director - Department-level access'),
    ('MANAGER', 4, 'DIRECTOR', 'Manager - Section-level access'),
    ('EXPERT', 5, 'MANAGER', 'Expert - Functional area access'),
    ('SPECIALIST', 6, 'EXPERT', 'Specialist - Narrow module scope'),
    ('ANALYST', 7, 'SPECIALIST', 'Analyst - Read-only/reporting access'),
    ('admin', 1, NULL, 'System Administrator - Full system access'),
    ('user', 7, NULL, 'Regular User - Standard user access')
ON CONFLICT (role) DO UPDATE SET
    level = EXCLUDED.level,
    parent_role = EXCLUDED.parent_role,
    description = EXCLUDED.description;

-- ============================================================
-- 7. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_division_id ON users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_section_id ON users(section_id);
CREATE INDEX IF NOT EXISTS idx_divisions_head_user_id ON divisions(head_user_id);
CREATE INDEX IF NOT EXISTS idx_departments_head_user_id ON departments(head_user_id);
CREATE INDEX IF NOT EXISTS idx_sections_head_user_id ON sections(head_user_id);

INSERT INTO schema_migrations (filename) VALUES ('039-rbac-role-hierarchy.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 040-add-second-winner-assigned.sql
-- ==============================================================================

-- Migration: 040-add-second-winner-assigned.sql
-- Description: Add second_winner_assigned flag to auctions table for reverse auction winner escalation

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS second_winner_assigned BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_auctions_second_winner_assigned ON auctions (second_winner_assigned);

INSERT INTO schema_migrations (filename) VALUES ('040-add-second-winner-assigned.sql') ON CONFLICT (filename) DO NOTHING;


-- ==============================================================================
-- Migration: 041-admin-auction-lifecycle-and-disputes.sql
-- ==============================================================================

-- Migration 041: Add payment_deadline_hours, escalation_rule to auctions, and document_urls to disputes
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS payment_deadline_hours INTEGER DEFAULT 720;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS escalation_rule VARCHAR(50) DEFAULT 'LOWEST_UNIQUE_BID';

CREATE INDEX IF NOT EXISTS idx_auctions_payment_deadline_hours ON auctions (payment_deadline_hours);
CREATE INDEX IF NOT EXISTS idx_auctions_escalation_rule ON auctions (escalation_rule);

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS document_urls TEXT;

INSERT INTO schema_migrations (filename) VALUES ('041-admin-auction-lifecycle-and-disputes.sql') ON CONFLICT (filename) DO NOTHING;
