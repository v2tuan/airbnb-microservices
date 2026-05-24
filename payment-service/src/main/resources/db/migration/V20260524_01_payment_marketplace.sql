ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS guest_id UUID,
    ADD COLUMN IF NOT EXISTS host_id UUID,
    ADD COLUMN IF NOT EXISTS host_stripe_account_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS platform_fee_amount BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS host_amount BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS refunded_amount BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_pi ON payments (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payment_intent_id VARCHAR(255),
    payload TEXT,
    status VARCHAR(30) NOT NULL,
    failure_reason TEXT,
    received_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP
);

ALTER TABLE payouts
    ADD COLUMN IF NOT EXISTS payment_id UUID,
    ADD COLUMN IF NOT EXISTS host_stripe_account_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_transfer_reversal_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_stripe_transfer
    ON payouts (stripe_transfer_id)
    WHERE stripe_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payouts_due
    ON payouts (status, scheduled_at, next_retry_at);
