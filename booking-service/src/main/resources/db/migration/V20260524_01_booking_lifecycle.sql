ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_bookings_listing_dates
    ON bookings (listing_id, check_in_date, check_out_date);

CREATE INDEX IF NOT EXISTS idx_bookings_expiry
    ON bookings (status, expires_at);

-- Stronger PostgreSQL-only option for production anti double-booking:
-- CREATE EXTENSION IF NOT EXISTS btree_gist;
-- ALTER TABLE bookings
--     ADD CONSTRAINT bookings_no_date_overlap
--     EXCLUDE USING gist (
--         listing_id WITH =,
--         daterange(check_in_date, check_out_date, '[)') WITH &&
--     )
--     WHERE (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'));
