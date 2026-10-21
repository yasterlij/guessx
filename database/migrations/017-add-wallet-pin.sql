ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_hash VARCHAR(60);

-- Ensure existing users can still use the app without a PIN
-- They will be prompted to set one on their first payment
