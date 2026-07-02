-- Hotel room-block bookings (Oromo community rate — hotels.html / api/book-hotel.js)
-- Same lifecycle as party_tickets: pending_payment row before Stripe Checkout,
-- webhook flips to paid.

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id                 BIGSERIAL PRIMARY KEY,
  booking_ref        TEXT UNIQUE NOT NULL,
  hotel_id           TEXT NOT NULL,
  hotel_name         TEXT NOT NULL,
  check_in           DATE NOT NULL,
  check_out          DATE NOT NULL,
  nights             INTEGER NOT NULL,
  rooms              INTEGER NOT NULL DEFAULT 1,
  nightly_cents      INTEGER NOT NULL,
  total_cents        INTEGER NOT NULL,
  discount_pct       INTEGER NOT NULL,
  guest_name         TEXT,
  guest_email        TEXT,
  status             TEXT NOT NULL DEFAULT 'pending_payment',
  stripe_session_id  TEXT,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hotel_bookings ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS; no public policies on purpose.

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_status ON hotel_bookings (status);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel ON hotel_bookings (hotel_id);
