-- Add Terms & Conditions acceptance columns to users table
-- Idempotent: uses IF NOT EXISTS so it can be re-run safely

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tc_accepted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tc_accepted_at TIMESTAMP NULL;
