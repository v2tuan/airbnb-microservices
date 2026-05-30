UPDATE bookings
SET status = 'CONFIRMED'
WHERE status = 'PAID';

UPDATE bookings
SET status = 'CANCELLED_BY_GUEST'
WHERE status = 'CANCELLED';
