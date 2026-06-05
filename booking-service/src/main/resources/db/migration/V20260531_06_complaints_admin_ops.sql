CREATE TABLE IF NOT EXISTS booking_complaints (
    complaint_id UUID PRIMARY KEY,
    booking_id UUID NOT NULL,
    guest_id UUID NOT NULL,
    host_id UUID NOT NULL,
    listing_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT,
    host_response TEXT,
    host_responded_at TIMESTAMP,
    host_response_deadline TIMESTAMP NOT NULL,
    escalated_at TIMESTAMP,
    admin_note TEXT,
    admin_decision VARCHAR(50),
    refund_amount NUMERIC(12, 2),
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_complaints_booking
    ON booking_complaints (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_complaints_guest
    ON booking_complaints (guest_id);

CREATE INDEX IF NOT EXISTS idx_booking_complaints_host
    ON booking_complaints (host_id);

CREATE INDEX IF NOT EXISTS idx_booking_complaints_status_deadline
    ON booking_complaints (status, host_response_deadline);

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_complaints_active_booking
    ON booking_complaints (booking_id)
    WHERE status IN ('WAITING_HOST_RESPONSE', 'OPEN', 'ESCALATED_TO_ADMIN', 'RESOLVED', 'REJECTED');

ALTER TABLE host_penalties
    ADD COLUMN IF NOT EXISTS waiver_reason VARCHAR(1000);
