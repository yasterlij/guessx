-- Add missing created_at column to favorites table
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites (created_at);
