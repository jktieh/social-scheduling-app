-- ============================================================
-- NICHLY - Social Scheduling App
-- Full Supabase Database Schema (with interests.is_active)
-- Drop & recreate all tables safely
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- DROP TABLES (reverse dependency order)
-- ============================================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS event_messages CASCADE;
DROP TABLE IF EXISTS user_matches CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS interest_categories CASCADE;
DROP TABLE IF EXISTS user_blocks CASCADE;
DROP TABLE IF EXISTS user_reports CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT UNIQUE NOT NULL,
  full_name           TEXT,
  avatar_url          TEXT,
  bio                 TEXT,
  date_of_birth       DATE,
  gender              TEXT CHECK (gender IN ('man', 'woman', 'non_binary', 'prefer_not_to_say', 'other')),

  -- Location (Canada)
  city                TEXT,
  province            TEXT CHECK (province IN (
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
    'Newfoundland and Labrador', 'Nova Scotia', 'Ontario',
    'Prince Edward Island', 'Quebec', 'Saskatchewan'
  )),
  country             TEXT DEFAULT 'Canada' CHECK (country = 'Canada'),

  -- Preferences
  is_discoverable     BOOLEAN DEFAULT TRUE,
  show_full_name      BOOLEAN DEFAULT FALSE,

  -- Matching / system
  match_score_cache   JSONB DEFAULT '{}',
  last_matched_at     TIMESTAMPTZ,
  is_verified         BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  onboarding_complete BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_discoverable ON profiles(is_discoverable) WHERE is_discoverable = TRUE;

-- ============================================================
-- 2. INTEREST CATEGORIES
-- ============================================================
CREATE TABLE interest_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  icon        TEXT,
  color       TEXT,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. INTERESTS
-- ============================================================
CREATE TABLE interests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID REFERENCES interest_categories(id) ON DELETE SET NULL,
  name            TEXT UNIQUE NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  icon            TEXT,
  typical_venue   TEXT,
  typical_duration_minutes INT DEFAULT 120,
  is_active       BOOLEAN DEFAULT TRUE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interests_category ON interests(category_id);
CREATE INDEX idx_interests_slug ON interests(slug);
CREATE INDEX idx_interests_active ON interests(is_active);

-- ============================================================
-- 4. USER INTERESTS
-- ============================================================
CREATE TABLE user_interests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
  level       INT DEFAULT 3 CHECK (level BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest_id)
);

CREATE INDEX idx_user_interests_user ON user_interests(user_id);
CREATE INDEX idx_user_interests_interest ON user_interests(interest_id);

-- ============================================================
-- 5. AVAILABILITY
-- ============================================================
CREATE TABLE availability (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_availability_user ON availability(user_id);
CREATE INDEX idx_availability_day ON availability(day_of_week);

-- ============================================================
-- 6. VENUES
-- ============================================================
CREATE TABLE venues (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  venue_type  TEXT,
  address     TEXT,
  city        TEXT,
  province    TEXT,
  country     TEXT DEFAULT 'Canada',
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_type ON venues(venue_type);

-- ============================================================
-- 7. EVENTS
-- ============================================================
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id    UUID REFERENCES venues(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  max_attendees INT DEFAULT 20,
  is_public   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. EVENT ATTENDEES
-- ============================================================
CREATE TABLE event_attendees (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id  UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status    TEXT CHECK (status IN ('going', 'interested', 'declined')) DEFAULT 'going',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ============================================================
-- 9. USER MATCHES
-- ============================================================
CREATE TABLE user_matches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_score  INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id)
);

-- ============================================================
-- 10. USER BLOCKS
-- ============================================================
CREATE TABLE user_blocks (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ============================================================
-- 11. USER REPORTS
-- ============================================================
CREATE TABLE user_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. EVENT MESSAGES
-- ============================================================
CREATE TABLE event_messages (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id  UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);