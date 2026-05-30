ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS nightly_price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS accommodation_subtotal NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS taxes NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cancellation_policy_code VARCHAR(30) DEFAULT 'FLEXIBLE',
    ADD COLUMN IF NOT EXISTS host_payout_eligible BOOLEAN DEFAULT FALSE;

UPDATE bookings
SET
    nightly_price = COALESCE(nightly_price, CASE
        WHEN total_nights IS NOT NULL AND total_nights > 0 THEN ROUND(total_price::numeric / total_nights, 2)
        ELSE total_price::numeric
    END),
    accommodation_subtotal = COALESCE(accommodation_subtotal, total_price::numeric - COALESCE(cleaning_fee, 0) - COALESCE(service_fee, 0) - COALESCE(taxes, 0)),
    cleaning_fee = COALESCE(cleaning_fee, 0),
    service_fee = COALESCE(service_fee, 0),
    taxes = COALESCE(taxes, 0),
    cancellation_policy_code = COALESCE(cancellation_policy_code, 'FLEXIBLE'),
    host_payout_eligible = COALESCE(host_payout_eligible, TRUE);

ALTER TABLE bookings
    ALTER COLUMN nightly_price SET NOT NULL,
    ALTER COLUMN accommodation_subtotal SET NOT NULL,
    ALTER COLUMN taxes SET NOT NULL,
    ALTER COLUMN cancellation_policy_code SET NOT NULL,
    ALTER COLUMN host_payout_eligible SET NOT NULL;
