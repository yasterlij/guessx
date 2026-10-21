ALTER TABLE bids ADD COLUMN IF NOT EXISTS ticket_number VARCHAR NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_bids_ticket_number ON bids (ticket_number);
