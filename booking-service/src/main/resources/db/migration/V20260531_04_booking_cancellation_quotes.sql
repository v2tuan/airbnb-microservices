CREATE TABLE IF NOT EXISTS booking_cancellation_quotes (
    quote_id UUID PRIMARY KEY,
    booking_id UUID NOT NULL,
    guest_id UUID NOT NULL,
    policy_code VARCHAR(30) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    accommodation_refund NUMERIC(12, 2) NOT NULL,
    cleaning_fee_refund NUMERIC(12, 2) NOT NULL,
    service_fee_refund NUMERIC(12, 2) NOT NULL,
    taxes_refund NUMERIC(12, 2) NOT NULL,
    refund_amount NUMERIC(12, 2) NOT NULL,
    non_refundable_amount NUMERIC(12, 2) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_cancellation_quotes_booking
    ON booking_cancellation_quotes (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_cancellation_quotes_guest
    ON booking_cancellation_quotes (guest_id);

CREATE INDEX IF NOT EXISTS idx_booking_cancellation_quotes_expires
    ON booking_cancellation_quotes (expires_at);
