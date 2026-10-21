ALTER TABLE products
  ADD COLUMN IF NOT EXISTS specs JSONB;

CREATE SEQUENCE IF NOT EXISTS auction_public_code_seq;

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS public_code VARCHAR(5);

ALTER TABLE auctions
  ALTER COLUMN public_code SET DEFAULT LPAD(nextval('auction_public_code_seq')::text, 5, '0');

UPDATE auctions
SET public_code = LPAD(nextval('auction_public_code_seq')::text, 5, '0')
WHERE public_code IS NULL OR public_code = '';

ALTER TABLE auctions
  ALTER COLUMN public_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auctions_public_code ON auctions (public_code);
