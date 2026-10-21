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
