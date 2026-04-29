-- OSFNA 2026 Supabase Schema
-- Run these in the Supabase SQL editor

-- Attendee profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS attendee_profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name          TEXT NOT NULL,
  city               TEXT,
  source             TEXT,           -- Instagram | TikTok | Friend | Soccer Team | Other
  heritage_community BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security: users can only read/update their own profile
ALTER TABLE attendee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON attendee_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON attendee_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role bypass (used by API functions with SERVICE_ROLE_KEY)
-- No additional policy needed — service role bypasses RLS by default.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendee_profiles_city   ON attendee_profiles (city);
CREATE INDEX IF NOT EXISTS idx_attendee_profiles_source ON attendee_profiles (source);

-- Party tickets (used by the QR wallet + scanner)
CREATE TABLE IF NOT EXISTS party_tickets (
  id                   BIGSERIAL PRIMARY KEY,
  ticket_id            TEXT UNIQUE NOT NULL,
  ticket_type          TEXT NOT NULL,
  quantity             INTEGER NOT NULL DEFAULT 1,
  unit_cents           INTEGER NOT NULL,
  total_cents          INTEGER NOT NULL,
  price_tier           TEXT,
  night                TEXT,
  table_id             TEXT,
  table_seats          INTEGER,
  holder_name          TEXT,
  holder_email         TEXT,
  attendee_id          UUID REFERENCES attendee_profiles(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'pending_payment',
  stripe_session_id    TEXT,
  paid_at              TIMESTAMPTZ,
  split_venue          INTEGER,
  split_treasury       INTEGER,
  split_platform       INTEGER,
  split_board_stipend  INTEGER,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_tickets_status ON party_tickets (status);
CREATE INDEX IF NOT EXISTS idx_party_tickets_attendee_id ON party_tickets (attendee_id);

-- Ticket scans for the gate scanner
CREATE TABLE IF NOT EXISTS ticket_scans (
  id          BIGSERIAL PRIMARY KEY,
  ticket_id   TEXT NOT NULL REFERENCES party_tickets(ticket_id) ON DELETE CASCADE,
  ticket_type TEXT,
  night       TEXT,
  scanner_id  TEXT,
  scanned_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_night ON ticket_scans (ticket_id, night);

-- Web push subscriptions for score / scarcity / gate alerts
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           BIGSERIAL PRIMARY KEY,
  endpoint     TEXT UNIQUE NOT NULL,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  topics       TEXT[] NOT NULL DEFAULT ARRAY['scores', 'scarcity', 'gates']::TEXT[],
  attendee_id  UUID REFERENCES attendee_profiles(id) ON DELETE SET NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_topics ON push_subscriptions USING GIN (topics);
