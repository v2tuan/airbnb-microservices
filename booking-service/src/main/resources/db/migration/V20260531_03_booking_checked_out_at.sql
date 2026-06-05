ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP;

UPDATE bookings
SET checked_out_at = COALESCE(checked_out_at, completed_at)
WHERE status IN ('CHECKED_OUT', 'COMPLETED')
  AND completed_at IS NOT NULL;
