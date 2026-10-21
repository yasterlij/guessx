-- Add tc_version column to users table for T&C version tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS tc_version VARCHAR(20);
