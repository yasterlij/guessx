DROP INDEX IF EXISTS idx_bids_auction_active;

CREATE INDEX CONCURRENTLY idx_bids_auction_amount ON bids (auction_id, amount);

CREATE INDEX CONCURRENTLY idx_bids_auction_lookup ON bids (auction_id, bid_time, amount);
