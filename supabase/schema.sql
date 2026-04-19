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
