-- Create disputes table for dispute resolution
CREATE TABLE IF NOT EXISTS disputes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL,
  auction_id  UUID,
  type        VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'OPEN',
  resolution  TEXT,
  resolved_by UUID,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes (user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes (created_at);
