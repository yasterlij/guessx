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
