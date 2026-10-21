-- Migration: 040-add-second-winner-assigned.sql
-- Description: Add second_winner_assigned flag to auctions table for reverse auction winner escalation

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS second_winner_assigned BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_auctions_second_winner_assigned ON auctions (second_winner_assigned);
