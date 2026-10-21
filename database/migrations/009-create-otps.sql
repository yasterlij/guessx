CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_phone_number ON otps (phone_number);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps (expires_at);

-- Register otps as a Citus reference table (replicated to all nodes).
-- Idempotent: skips if Citus is absent or otps is already a reference table.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'citus')
     AND NOT EXISTS (SELECT 1 FROM citus_tables WHERE table_name = 'otps'::regclass) THEN
    PERFORM create_reference_table('otps');
  END IF;
END $$;
