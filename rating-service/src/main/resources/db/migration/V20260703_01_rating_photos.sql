CREATE TABLE IF NOT EXISTS rating_photos (
  id VARCHAR(255) PRIMARY KEY,
  rating_id VARCHAR(255) NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  public_id VARCHAR(512),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rating_photos_rating
    FOREIGN KEY (rating_id)
    REFERENCES ratings(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rating_photos_rating_order
  ON rating_photos (rating_id, sort_order);
