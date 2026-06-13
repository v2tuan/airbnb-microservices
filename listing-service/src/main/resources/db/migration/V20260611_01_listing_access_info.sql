CREATE TABLE IF NOT EXISTS listing_access_info (
    access_info_id UUID PRIMARY KEY,
    listing_id UUID NOT NULL UNIQUE,
    wifi_password VARCHAR(255),
    entry_code VARCHAR(100),
    smart_lock_instructions TEXT,
    key_pickup_instructions TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_listing_access_info_listing
        FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_access_info_listing
    ON listing_access_info(listing_id);

CREATE TABLE IF NOT EXISTS listing_guide_steps (
    guide_step_id UUID PRIMARY KEY,
    access_info_id UUID NOT NULL,
    step_number INTEGER NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_listing_guide_steps_access_info
        FOREIGN KEY (access_info_id) REFERENCES listing_access_info(access_info_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_guide_steps_access_info
    ON listing_guide_steps(access_info_id);
