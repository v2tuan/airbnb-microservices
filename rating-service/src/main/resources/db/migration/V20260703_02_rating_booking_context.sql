ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS booking_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ratings_booking_id
  ON ratings (booking_id)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ratings_booking
  ON ratings (booking_id);
