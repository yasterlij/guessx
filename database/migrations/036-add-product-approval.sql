-- Add product approval workflow columns to products table
-- Idempotent: uses IF NOT EXISTS so it can be re-run safely

ALTER TABLE products
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS approved_by UUID NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Add foreign key constraint for approved_by -> users.id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_products_approved_by'
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT fk_products_approved_by
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for querying pending products
CREATE INDEX IF NOT EXISTS idx_products_approval_status
ON products (approval_status);
