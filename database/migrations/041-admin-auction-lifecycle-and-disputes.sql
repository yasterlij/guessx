-- Migration 041: Add payment_deadline_hours, escalation_rule to auctions, and document_urls to disputes
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS payment_deadline_hours INTEGER DEFAULT 720;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS escalation_rule VARCHAR(50) DEFAULT 'LOWEST_UNIQUE_BID';

CREATE INDEX IF NOT EXISTS idx_auctions_payment_deadline_hours ON auctions (payment_deadline_hours);
CREATE INDEX IF NOT EXISTS idx_auctions_escalation_rule ON auctions (escalation_rule);

ALTER TABLE disputes ADD COLUMN IF NOT EXISTS document_urls TEXT;
