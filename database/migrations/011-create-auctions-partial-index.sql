CREATE INDEX CONCURRENTLY idx_auctions_active_lookup
ON auctions (end_time, id)
WHERE status = 'ACTIVE';
