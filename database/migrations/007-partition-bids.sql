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
