CREATE INDEX IF NOT EXISTS idx_listings_lower_city
    ON listings (lower(city));

CREATE INDEX IF NOT EXISTS idx_listings_status_property_type
    ON listings (status, property_type);

CREATE INDEX IF NOT EXISTS idx_listings_status_created_desc
    ON listings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_status_lower_city_property_instant_created
    ON listings (status, lower(city), property_type, instant_book DESC, created_at DESC);
