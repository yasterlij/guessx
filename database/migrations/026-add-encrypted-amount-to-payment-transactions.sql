ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS encrypted_amount VARCHAR(512) DEFAULT '';