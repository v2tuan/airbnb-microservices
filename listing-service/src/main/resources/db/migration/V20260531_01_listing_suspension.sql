ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(500);
