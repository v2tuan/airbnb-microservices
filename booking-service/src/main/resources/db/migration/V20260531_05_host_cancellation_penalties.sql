CREATE TABLE IF NOT EXISTS host_cancellation_quotes (
    quote_id UUID PRIMARY KEY,
    booking_id UUID NOT NULL,
    host_id UUID NOT NULL,
    listing_id UUID NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    guest_refund_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    penalty_points INTEGER NOT NULL,
    listing_active_penalty_count INTEGER NOT NULL,
    host_active_penalty_count INTEGER NOT NULL,
    will_suspend_listing BOOLEAN NOT NULL,
    listing_suspended_until TIMESTAMP,
    will_mark_host_admin_review BOOLEAN NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_host_cancellation_quotes_booking
    ON host_cancellation_quotes (booking_id);

CREATE INDEX IF NOT EXISTS idx_host_cancellation_quotes_host
    ON host_cancellation_quotes (host_id);

CREATE INDEX IF NOT EXISTS idx_host_cancellation_quotes_expires
    ON host_cancellation_quotes (expires_at);

CREATE TABLE IF NOT EXISTS host_penalties (
    penalty_id UUID PRIMARY KEY,
    booking_id UUID NOT NULL UNIQUE,
    host_id UUID NOT NULL,
    listing_id UUID NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL,
    listing_suspension_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    host_admin_review_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    listing_suspended_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    waived_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_host_penalties_booking
    ON host_penalties (booking_id);

CREATE INDEX IF NOT EXISTS idx_host_penalties_host_status
    ON host_penalties (host_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_host_penalties_listing_status
    ON host_penalties (listing_id, status, created_at);
