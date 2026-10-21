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
