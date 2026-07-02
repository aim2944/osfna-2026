-- OSFNA 2026 — Security + Promo migration (2026-07-01)
-- Run in the Supabase SQL editor AFTER schema.sql.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS everywhere).

-- ─────────────────────────────────────────────────────────────
-- 0. Registration tables (were referenced in code but missing from schema.sql)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_registrations (
  id                 BIGSERIAL PRIMARY KEY,
  reg_ref            TEXT UNIQUE,             -- unique idempotency key for the Stripe webhook
  sport              TEXT NOT NULL,
  team_name          TEXT NOT NULL,
  city               TEXT,
  club_affiliation   TEXT,
  division           TEXT,
  contact_name       TEXT,
  contact_email      TEXT,
  contact_phone      TEXT,
  roster_count       TEXT,
  jersey_color       TEXT,
  heritage_confirmed BOOLEAN DEFAULT false,
  "returning"        BOOLEAN DEFAULT false, -- quoted: "returning" is a reserved SQL keyword
  notes              TEXT,
  status             TEXT NOT NULL DEFAULT 'pending_review',
  fee_cents          INTEGER,
  stripe_session_id  TEXT,
  paid_at            TIMESTAMPTZ,
  submitted_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_registrations (
  id                 BIGSERIAL PRIMARY KEY,
  reg_ref            TEXT UNIQUE,
  business_name      TEXT NOT NULL,
  business_type      TEXT,
  contact_name       TEXT,
  email              TEXT,
  phone              TEXT,
  city               TEXT,
  booth_size         TEXT,
  power              TEXT,
  products_desc      TEXT,
  setup_pref         TEXT,
  notes              TEXT,
  status             TEXT NOT NULL DEFAULT 'pending_review',
  fee_cents          INTEGER,
  stripe_session_id  TEXT,
  paid_at            TIMESTAMPTZ,
  submitted_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS volunteer_registrations (
  id                 BIGSERIAL PRIMARY KEY,
  first_name         TEXT,
  last_name          TEXT,
  email              TEXT,
  phone              TEXT,
  preferred_role     TEXT,
  days_available     TEXT,
  age_group          TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  submitted_at       TIMESTAMPTZ DEFAULT NOW()
);

-- If the tables already existed without reg_ref, add it.
ALTER TABLE team_registrations   ADD COLUMN IF NOT EXISTS reg_ref TEXT;
ALTER TABLE vendor_registrations ADD COLUMN IF NOT EXISTS reg_ref TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_reg_ref   ON team_registrations (reg_ref);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_reg_ref ON vendor_registrations (reg_ref);

-- Registration tables hold PII — RLS on, no public policies. Only the API
-- (service role, which bypasses RLS) may read/write. Never expose an anon policy.
ALTER TABLE team_registrations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_registrations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_registrations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 1. Close the double-scan race: one paid entry per ticket per night.
--    scan-qr.js relies on this UNIQUE to reject concurrent duplicate scans.
-- ─────────────────────────────────────────────────────────────
-- De-dupe any existing rows first so the unique index can be created.
DELETE FROM ticket_scans a USING ticket_scans b
  WHERE a.id > b.id AND a.ticket_id = b.ticket_id AND a.night = b.night;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_scans_ticket_night
  ON ticket_scans (ticket_id, night);

-- ─────────────────────────────────────────────────────────────
-- 2. Promo codes (promoter attribution + commission tracking)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id                 BIGSERIAL PRIMARY KEY,
  code               TEXT UNIQUE NOT NULL,          -- e.g. TETTEY, YOMI
  promoter_username  TEXT,                          -- IG handle
  promoter_name      TEXT,
  role               TEXT,                          -- Twin Cities Campus Lead, etc.
  region             TEXT,
  discount_type      TEXT DEFAULT 'none',           -- none | percent | fixed_cents
  discount_value     INTEGER DEFAULT 0,
  commission_pct     INTEGER DEFAULT 15,            -- promoter's cut of tracked sales
  perks              TEXT,                           -- free_entry | vip | commission
  active             BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes (active);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Attribute each ticket sale to a promo code.
ALTER TABLE party_tickets ADD COLUMN IF NOT EXISTS promo_code TEXT;
CREATE INDEX IF NOT EXISTS idx_party_tickets_promo_code ON party_tickets (promo_code);
