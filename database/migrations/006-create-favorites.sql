CREATE TABLE favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, auction_id)
);

CREATE INDEX idx_favorites_user_id ON favorites (user_id);
