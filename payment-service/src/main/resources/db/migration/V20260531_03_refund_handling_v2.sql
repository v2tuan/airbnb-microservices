ALTER TABLE refunds
    ADD COLUMN IF NOT EXISTS business_cause VARCHAR(50),
    ADD COLUMN IF NOT EXISTS business_cause_id UUID,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT;

UPDATE refunds
SET status = CASE status
    WHEN 'REFUNDED' THEN 'COMPLETED'
    WHEN 'CANCELLED' THEN 'FAILED'
    ELSE COALESCE(status, 'PENDING')
END
WHERE status IS NULL
   OR status IN ('REFUNDED', 'CANCELLED');

UPDATE refunds
SET business_cause = 'CANCELLATION_QUOTE'
WHERE business_cause IS NULL;

UPDATE refunds
SET business_cause_id = '00000000-0000-0000-0000-000000000000'
WHERE business_cause_id IS NULL;

ALTER TABLE refunds
    ALTER COLUMN status SET DEFAULT 'PENDING',
    ALTER COLUMN business_cause SET NOT NULL,
    ALTER COLUMN business_cause_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refunds_business_cause
    ON refunds (business_cause, business_cause_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_business_cause
    ON refunds (business_cause, business_cause_id)
    WHERE business_cause_id <> '00000000-0000-0000-0000-000000000000'::uuid;
