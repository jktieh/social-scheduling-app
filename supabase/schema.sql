-- ============================================================
-- NICHLY — Full Database Schema
-- Run in: Supabase SQL Editor
-- Safe to re-run: uses DROP IF EXISTS
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Drop existing tables (reverse dependency order) ──────────
DROP TABLE IF EXISTS notifications        CASCADE;
DROP TABLE IF EXISTS event_messages       CASCADE;
DROP TABLE IF EXISTS event_participants   CASCADE;
DROP TABLE IF EXISTS events               CASCADE;
DROP TABLE IF EXISTS venues               CASCADE;
DROP TABLE IF EXISTS availability         CASCADE;
DROP TABLE IF EXISTS user_interests       CASCADE;
DROP TABLE IF EXISTS interests            CASCADE;
DROP TABLE IF EXISTS interest_categories  CASCADE;
DROP TABLE IF EXISTS user_blocks          CASCADE;
DROP TABLE IF EXISTS profiles             CASCADE;

-- ── Drop functions ────────────────────────────────────────────
DROP FUNCTION IF EXISTS handle_new_user()               CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column()      CASCADE;
DROP FUNCTION IF EXISTS update_event_participant_count() CASCADE;

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username             TEXT UNIQUE NOT NULL,
  full_name            TEXT,
  avatar_url           TEXT,
  bio                  TEXT,
  city                 TEXT,
  latitude             DOUBLE PRECISION,
  longitude            DOUBLE PRECISION,
  onboarding_complete  BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_city ON profiles(city);

-- ============================================================
-- 2. INTEREST CATEGORIES
-- ============================================================
CREATE TABLE interest_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT UNIQUE NOT NULL,
  icon       TEXT,
  color      TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. INTERESTS
-- ============================================================
CREATE TABLE interests (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id              UUID REFERENCES interest_categories(id) ON DELETE SET NULL,
  name                     TEXT UNIQUE NOT NULL,
  slug                     TEXT UNIQUE NOT NULL,
  icon                     TEXT,
  typical_venue            TEXT,
  typical_duration_minutes INT DEFAULT 120,
  is_active                BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interests_category ON interests(category_id);
CREATE INDEX idx_interests_slug     ON interests(slug);

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

CREATE INDEX idx_user_interests_user     ON user_interests(user_id);
CREATE INDEX idx_user_interests_interest ON user_interests(interest_id);

-- ============================================================
-- 5. AVAILABILITY
-- ============================================================
CREATE TABLE availability (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_of_week, start_time)
);

CREATE INDEX idx_availability_user ON availability(user_id);
CREATE INDEX idx_availability_day  ON availability(day_of_week);

-- ============================================================
-- 6. VENUES
-- ============================================================
CREATE TABLE venues (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  venue_type  TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  photo_url   TEXT,
  price_range INT CHECK (price_range BETWEEN 1 AND 4),
  rating      NUMERIC(2,1),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venues_type ON venues(venue_type);
CREATE INDEX idx_venues_city ON venues(city);

-- ============================================================
-- 7. EVENTS
-- ============================================================
CREATE TABLE events (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title              TEXT NOT NULL,
  description        TEXT,
  interest_id        UUID REFERENCES interests(id) ON DELETE SET NULL,
  venue_id           UUID REFERENCES venues(id)    ON DELETE SET NULL,
  starts_at          TIMESTAMPTZ NOT NULL,
  ends_at            TIMESTAMPTZ,
  min_attendees      INT DEFAULT 2,
  max_attendees      INT DEFAULT 8,
  current_attendees  INT DEFAULT 0,
  status             TEXT DEFAULT 'pending' CHECK (status IN (
                       'pending','confirmed','full','cancelled','completed'
                     )),
  is_auto_generated  BOOLEAN DEFAULT TRUE,
  created_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cover_image_url    TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_status    ON events(status);
CREATE INDEX idx_events_starts_at ON events(starts_at);
CREATE INDEX idx_events_interest  ON events(interest_id);

-- ============================================================
-- 8. EVENT PARTICIPANTS
-- ============================================================
CREATE TABLE event_participants (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id     UUID REFERENCES events(id)   ON DELETE CASCADE,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'invited' CHECK (status IN (
                 'invited','confirmed','declined','attended','no_show'
               )),
  is_host      BOOLEAN DEFAULT FALSE,
  responded_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_participants_event  ON event_participants(event_id);
CREATE INDEX idx_event_participants_user   ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);

-- ============================================================
-- 9. EVENT MESSAGES (chat)
-- ============================================================
CREATE TABLE event_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID REFERENCES events(id)   ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  is_system  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_messages_event   ON event_messages(event_id);
CREATE INDEX idx_event_messages_created ON event_messages(created_at);

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB DEFAULT '{}',
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
-- SET search_path is required for SECURITY DEFINER triggers in Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    'user_' || REPLACE(NEW.id::TEXT, '-', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update current_attendees count
CREATE OR REPLACE FUNCTION update_event_participant_count()
RETURNS TRIGGER AS $$
DECLARE target_event_id UUID;
BEGIN
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);

  UPDATE events
  SET current_attendees = (
    SELECT COUNT(*) FROM event_participants
    WHERE event_id = target_event_id AND status = 'confirmed'
  ),
  status = CASE
    WHEN (SELECT COUNT(*) FROM event_participants WHERE event_id = target_event_id AND status = 'confirmed')
         >= (SELECT max_attendees FROM events WHERE id = target_event_id) THEN 'full'
    WHEN (SELECT COUNT(*) FROM event_participants WHERE event_id = target_event_id AND status = 'confirmed')
         >= (SELECT min_attendees FROM events WHERE id = target_event_id)
         AND status = 'pending' THEN 'confirmed'
    ELSE status
  END
  WHERE id = target_event_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_participant_change
  AFTER INSERT OR UPDATE OR DELETE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION update_event_participant_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles viewable by all"    ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users update own profile"    ON profiles FOR UPDATE USING (auth.uid() = id);

-- User interests
CREATE POLICY "Own interests"               ON user_interests FOR ALL USING (auth.uid() = user_id);

-- Availability
CREATE POLICY "Own availability"            ON availability FOR ALL USING (auth.uid() = user_id);

-- Events: public read
CREATE POLICY "Events publicly readable"    ON events FOR SELECT USING (TRUE);

-- Event participants
CREATE POLICY "Participants visible"        ON event_participants FOR SELECT USING (TRUE);
CREATE POLICY "Update own RSVP"             ON event_participants FOR UPDATE USING (auth.uid() = user_id);

-- Messages visible to confirmed participants
CREATE POLICY "Messages to attendees"       ON event_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM event_participants
    WHERE event_id = event_messages.event_id
      AND user_id = auth.uid()
      AND status IN ('confirmed','attended','invited')
  )
);
CREATE POLICY "Attendees can message"       ON event_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM event_participants
    WHERE event_id = event_messages.event_id
      AND user_id = auth.uid()
      AND status IN ('confirmed','invited')
  )
);

-- Notifications: own only
CREATE POLICY "Own notifications"           ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update own notifications"    ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE event_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE event_participants;

-- ============================================================
-- SEED DATA — Interest Categories
-- ============================================================
INSERT INTO interest_categories (name, icon, color, sort_order) VALUES
  ('Games',         '🎲', '#06b6d4', 1),
  ('Fitness',       '💪', '#f97316', 2),
  ('Outdoors',      '🌲', '#22c55e', 3),
  ('Arts & Crafts', '🎨', '#14b8a6', 4),
  ('Music',         '🎵', '#2563eb', 5),
  ('Food & Drink',  '🍜', '#eab308', 6),
  ('Learning',      '📚', '#06b6d4', 7),
  ('Tech',          '💻', '#3b82f6', 8),
  ('Wellness',      '🧘', '#84cc16', 9),
  ('Social',        '🗣️', '#f43f5e', 10);

-- ============================================================
-- SEED DATA — Interests
-- ============================================================
INSERT INTO interests (category_id, name, slug, icon, typical_venue, typical_duration_minutes)
SELECT c.id, i.name, i.slug, i.icon, i.venue, i.duration
FROM interest_categories c
JOIN (VALUES
  ('Games',        'Board Games',      'board-games',     '🎲', 'board_game_cafe', 180),
  ('Games',        'Card Games',       'card-games',      '🃏', 'cafe',            120),
  ('Games',        'Video Games',      'video-games',     '🎮', 'gaming_lounge',   180),
  ('Games',        'Trivia Nights',    'trivia',          '❓', 'bar',             150),
  ('Games',        'Escape Rooms',     'escape-rooms',    '🔐', 'escape_room',     90),
  ('Games',        'Dungeons & Dragons','dnd',            '🐉', 'game_store',      240),
  ('Fitness',      'Rock Climbing',    'rock-climbing',   '🧗', 'climbing_gym',    120),
  ('Fitness',      'Running',          'running',         '🏃', 'park',            60),
  ('Fitness',      'Yoga',             'yoga',            '🧘', 'yoga_studio',     75),
  ('Fitness',      'Hiking',           'hiking',          '🥾', 'park',            180),
  ('Fitness',      'Cycling',          'cycling',         '🚴', 'park',            120),
  ('Learning',     'Book Club',        'book-club',       '📖', 'library',         120),
  ('Learning',     'Language Exchange','language-exchange','🗣️','cafe',            90),
  ('Learning',     'Coding',           'coding',          '💻', 'library',         180),
  ('Learning',     'Study Groups',     'study-groups',    '📝', 'library',         120),
  ('Learning',     'Photography',      'photography',     '📷', 'park',            180),
  ('Arts & Crafts','Painting',         'painting',        '🖌️', 'art_studio',      120),
  ('Arts & Crafts','Pottery',          'pottery',         '🏺', 'pottery_studio',  120),
  ('Music',        'Karaoke',          'karaoke',         '🎤', 'karaoke_bar',     180),
  ('Music',        'Jam Sessions',     'jam-sessions',    '🎹', 'rehearsal_space', 120),
  ('Food & Drink', 'Coffee Tasting',   'coffee',          '☕', 'cafe',            90),
  ('Food & Drink', 'Restaurant Crawl', 'restaurant-crawl','🍽️','restaurant',      180),
  ('Food & Drink', 'Cooking Class',    'cooking-class',   '👨‍🍳','cooking_school',  180),
  ('Food & Drink', 'Brewery Tour',     'brewery-tour',    '🍺', 'brewery',         150),
  ('Outdoors',     'Picnics',          'picnics',         '🧺', 'park',            120),
  ('Outdoors',     'Kayaking',         'kayaking',        '🛶', 'waterfront',      180),
  ('Wellness',     'Meditation',       'meditation',      '🧘', 'wellness_center', 60),
  ('Tech',         'Hackathon',        'hackathon',       '⚡', 'coworking_space', 480),
  ('Social',       'Networking',       'networking',      '🤝', 'coworking_space', 120),
  ('Social',       'Volunteering',     'volunteering',    '🤲', 'community_center',180)
) AS i(category, name, slug, icon, venue, duration)
ON c.name = i.category;

-- ============================================================
-- SEED DATA — Venues (Calgary + generic)
-- ============================================================
INSERT INTO venues (name, venue_type, address, city, latitude, longitude, price_range, rating) VALUES
  ('Hexagon Board Game Cafe',    'board_game_cafe',  '203 20 Ave SW',        'Calgary',    51.0447, -114.0719, 2, 4.7),
  ('Calgary Climbing Centre',    'climbing_gym',     '220 12 Ave SW',        'Calgary',    51.0427, -114.0630, 2, 4.8),
  ('Calgary Central Library',    'library',          '800 3 St SE',          'Calgary',    51.0447, -114.0584, 1, 4.9),
  ('Last Best Brewing',          'brewery',          '607 11 Ave SW',        'Calgary',    51.0431, -114.0810, 2, 4.5),
  ('Analog Coffee',              'cafe',             '740 17 Ave SW',        'Calgary',    51.0368, -114.0787, 1, 4.6),
  ('Bow River Pathway',          'park',             'Bow River Pathway',    'Calgary',    51.0486, -114.0708, 1, 4.8),
  ('Memorial Park',              'park',             '1221 2 St SW',         'Calgary',    51.0491, -114.0812, 1, 4.5),
  ('Inglewood Bird Sanctuary',   'park',             '2425 9 Ave SE',        'Calgary',    51.0410, -114.0207, 1, 4.7),
  ('Escape Hour Calgary',        'escape_room',      '906 16 Ave SW',        'Calgary',    51.0408, -114.0841, 3, 4.6),
  ('The Commons Calgary',        'coworking_space',  '1011 1 St SW',         'Calgary',    51.0474, -114.0637, 2, 4.4),
  ('Studio Bell',                'music_venue',      '850 4 St SE',          'Calgary',    51.0453, -114.0555, 2, 4.8),
  ('Fish Creek Park',            'park',             'Canyon Meadows Dr SW',  'Calgary',   50.9368, -114.0742, 1, 4.9),
  ('Village Ice Cream',          'cafe',             '431 10 Ave SW',        'Calgary',    51.0433, -114.0709, 1, 4.7),
  ('The Yoga Collective',        'yoga_studio',      '1333 8 St SW',         'Calgary',    51.0392, -114.0877, 2, 4.6),
  ('Saddledome Area Library',    'library',          '616 Macleod Trail SE', 'Calgary',    51.0381, -114.0510, 1, 4.3);

-- ============================================================
-- Done! Nichly schema ready. 🎯
-- ============================================================
