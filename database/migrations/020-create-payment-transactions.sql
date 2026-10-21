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
