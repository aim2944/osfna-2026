-- Bed-type preference on hotel bookings (hotels.html bed selector, Jul 3 2026).
-- api/_book-hotel.js inserts bed_type and falls back to omitting it until this
-- migration is applied, so it is safe to run any time.

ALTER TABLE hotel_bookings ADD COLUMN IF NOT EXISTS bed_type TEXT;
