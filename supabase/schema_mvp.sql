-- ============================================================
-- NICHLY MVP — Database Schema
-- Interest-driven event discovery with threshold-based confirmation
-- Run in: Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Drop existing tables (reverse dependency order) ──────────
DROP TABLE IF EXISTS event_setting_votes  CASCADE;
DROP TABLE IF EXISTS event_setting_proposals CASCADE;
DROP TABLE IF EXISTS notifications        CASCADE;
DROP TABLE IF EXISTS event_messages       CASCADE;
DROP TABLE IF EXISTS event_interests      CASCADE;
DROP TABLE IF EXISTS events              CASCADE;
DROP TABLE IF EXISTS venues              CASCADE;
DROP TABLE IF EXISTS availability        CASCADE;
DROP TABLE IF EXISTS user_interests      CASCADE;
DROP TABLE IF EXISTS interests           CASCADE;
DROP TABLE IF EXISTS interest_categories CASCADE;
DROP TABLE IF EXISTS profiles            CASCADE;

DROP FUNCTION IF EXISTS handle_new_user()                  CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column()         CASCADE;
DROP FUNCTION IF EXISTS check_event_threshold()            CASCADE;

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
  is_active            BOOLEAN DEFAULT TRUE,
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

-- ============================================================
-- 5. AVAILABILITY
-- ============================================================
CREATE TABLE availability (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_of_week, start_time)
);

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
-- 7. EVENTS — core table
--
-- Status flow:
--   draft → open (accepting interest) → confirmed (threshold met) → completed / cancelled
--
-- threshold_count: number of "interested" users required to confirm the event
-- interested_count: live count updated by trigger
-- ============================================================
CREATE TABLE events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interest_id         UUID REFERENCES interests(id) ON DELETE SET NULL,
  venue_id            UUID REFERENCES venues(id) ON DELETE SET NULL,
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,

  title               TEXT NOT NULL,
  description         TEXT,
  cover_image_url     TEXT,

  -- Scheduling — proposed defaults, can be changed by vote
  proposed_start      TIMESTAMPTZ NOT NULL,
  proposed_end        TIMESTAMPTZ,
  confirmed_start     TIMESTAMPTZ,
  confirmed_end       TIMESTAMPTZ,
  confirmed_venue_id  UUID REFERENCES venues(id) ON DELETE SET NULL,

  -- Threshold mechanics
  threshold_count     INT NOT NULL DEFAULT 4,   -- users needed to confirm
  interested_count    INT NOT NULL DEFAULT 0,   -- live count

  -- Limits
  max_attendees       INT DEFAULT 12,

  -- Status
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','confirmed','completed','cancelled')),

  is_auto_generated   BOOLEAN DEFAULT FALSE,
  city                TEXT,                     -- used for filtering

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_status      ON events(status);
CREATE INDEX idx_events_interest    ON events(interest_id);
CREATE INDEX idx_events_city        ON events(city);
CREATE INDEX idx_events_proposed    ON events(proposed_start);

-- ============================================================
-- 8. EVENT INTERESTS — who expressed interest / joined
--
-- status flow: interested → confirmed → attended | declined | no_show
-- ============================================================
CREATE TABLE event_interests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id     UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'interested'
               CHECK (status IN ('interested','confirmed','declined','attended','no_show')),
  is_host      BOOLEAN DEFAULT FALSE,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_interests_event  ON event_interests(event_id);
CREATE INDEX idx_event_interests_user   ON event_interests(user_id);
CREATE INDEX idx_event_interests_status ON event_interests(status);

-- ============================================================
-- 9. EVENT MESSAGES — group chat
-- ============================================================
CREATE TABLE event_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  is_system  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_messages_event   ON event_messages(event_id);
CREATE INDEX idx_event_messages_created ON event_messages(created_at);

-- ============================================================
-- 10. EVENT SETTING PROPOSALS — time/venue change proposals
-- ============================================================
CREATE TABLE event_setting_proposals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID REFERENCES events(id) ON DELETE CASCADE,
  proposed_by     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('time','venue')),

  -- Time change fields
  new_start       TIMESTAMPTZ,
  new_end         TIMESTAMPTZ,

  -- Venue change fields
  new_venue_id    UUID REFERENCES venues(id) ON DELETE SET NULL,
  new_venue_name  TEXT,           -- for free-text venue suggestions

  votes_for       INT DEFAULT 0,
  votes_against   INT DEFAULT 0,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','accepted','rejected')),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_esp_event ON event_setting_proposals(event_id);

-- ============================================================
-- 11. EVENT SETTING VOTES
-- ============================================================
CREATE TABLE event_setting_votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID REFERENCES event_setting_proposals(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vote        BOOLEAN NOT NULL,  -- TRUE = for, FALSE = against
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, user_id)
);

-- ============================================================
-- 12. NOTIFICATIONS
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
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
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

-- Auto-update interested_count and check threshold
CREATE OR REPLACE FUNCTION check_event_threshold()
RETURNS TRIGGER AS $$
DECLARE
  target_event_id UUID;
  new_count INT;
  threshold INT;
  evt_status TEXT;
BEGIN
  target_event_id := COALESCE(NEW.event_id, OLD.event_id);

  SELECT COUNT(*) INTO new_count
  FROM event_interests
  WHERE event_id = target_event_id
    AND status IN ('interested', 'confirmed');

  SELECT threshold_count, status INTO threshold, evt_status
  FROM events WHERE id = target_event_id;

  UPDATE events
  SET
    interested_count = new_count,
    status = CASE
      WHEN new_count >= threshold AND evt_status = 'open' THEN 'confirmed'
      ELSE status
    END,
    confirmed_start = CASE
      WHEN new_count >= threshold AND evt_status = 'open' THEN proposed_start
      ELSE confirmed_start
    END,
    confirmed_end = CASE
      WHEN new_count >= threshold AND evt_status = 'open' THEN proposed_end
      ELSE confirmed_end
    END,
    confirmed_venue_id = CASE
      WHEN new_count >= threshold AND evt_status = 'open' THEN venue_id
      ELSE confirmed_venue_id
    END
  WHERE id = target_event_id;

  -- When newly confirmed, update all interested users to confirmed
  IF new_count >= threshold AND evt_status = 'open' THEN
    UPDATE event_interests
    SET status = 'confirmed'
    WHERE event_id = target_event_id AND status = 'interested';

    -- System message
    INSERT INTO event_messages (event_id, user_id, content, is_system)
    SELECT target_event_id, NULL,
      '🎉 This event is confirmed! Welcome everyone — say hello in the chat!',
      TRUE
    WHERE NOT EXISTS (
      SELECT 1 FROM event_messages
      WHERE event_id = target_event_id AND is_system = TRUE AND content LIKE '🎉%'
    );

    -- Notifications
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT
      ei.user_id,
      'event_confirmed',
      'Your event is confirmed!',
      'Enough people joined — the event is happening. Check the group chat!',
      jsonb_build_object('event_id', target_event_id)
    FROM event_interests ei
    WHERE ei.event_id = target_event_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_event_interest_change
  AFTER INSERT OR UPDATE OR DELETE ON event_interests
  FOR EACH ROW EXECUTE FUNCTION check_event_threshold();

-- Auto-tally votes and resolve proposals
CREATE OR REPLACE FUNCTION tally_setting_vote()
RETURNS TRIGGER AS $$
DECLARE
  total_participants INT;
  votes_f INT;
  votes_a INT;
  prop event_setting_proposals%ROWTYPE;
BEGIN
  SELECT * INTO prop FROM event_setting_proposals WHERE id = NEW.proposal_id;

  SELECT COUNT(*) INTO total_participants
  FROM event_interests
  WHERE event_id = prop.event_id AND status = 'confirmed';

  SELECT
    COUNT(*) FILTER (WHERE vote = TRUE),
    COUNT(*) FILTER (WHERE vote = FALSE)
  INTO votes_f, votes_a
  FROM event_setting_votes WHERE proposal_id = NEW.proposal_id;

  UPDATE event_setting_proposals
  SET votes_for = votes_f, votes_against = votes_a
  WHERE id = NEW.proposal_id;

  -- Majority wins (>50%)
  IF votes_f > total_participants / 2 THEN
    UPDATE event_setting_proposals
    SET status = 'accepted', resolved_at = NOW()
    WHERE id = NEW.proposal_id;

    -- Apply the change to the event
    IF prop.type = 'time' THEN
      UPDATE events SET confirmed_start = prop.new_start, confirmed_end = prop.new_end
      WHERE id = prop.event_id;
    ELSIF prop.type = 'venue' THEN
      UPDATE events SET confirmed_venue_id = prop.new_venue_id
      WHERE id = prop.event_id;
    END IF;

    INSERT INTO event_messages (event_id, user_id, content, is_system)
    VALUES (
      prop.event_id, NULL,
      CASE prop.type
        WHEN 'time' THEN '🗳️ Vote passed! The event time has been updated.'
        WHEN 'venue' THEN '🗳️ Vote passed! The event venue has been updated.'
      END,
      TRUE
    );

  ELSIF votes_a > total_participants / 2 THEN
    UPDATE event_setting_proposals
    SET status = 'rejected', resolved_at = NOW()
    WHERE id = NEW.proposal_id;

    INSERT INTO event_messages (event_id, user_id, content, is_system)
    VALUES (prop.event_id, NULL, '🗳️ The proposed change was voted down.', TRUE);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_setting_vote
  AFTER INSERT ON event_setting_votes
  FOR EACH ROW EXECUTE FUNCTION tally_setting_vote();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability          ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_setting_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_setting_votes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles viewable by all"  ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users update own profile"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- User interests
CREATE POLICY "Own interests"             ON user_interests FOR ALL USING (auth.uid() = user_id);

-- Availability
CREATE POLICY "Own availability"          ON availability FOR ALL USING (auth.uid() = user_id);

-- Events: public read, authenticated insert
CREATE POLICY "Events publicly readable"  ON events FOR SELECT USING (TRUE);
CREATE POLICY "Auth users create events"  ON events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creator updates event"     ON events FOR UPDATE USING (auth.uid() = created_by);

-- Event interests
CREATE POLICY "Event interests readable"  ON event_interests FOR SELECT USING (TRUE);
CREATE POLICY "Users manage own interest" ON event_interests FOR ALL USING (auth.uid() = user_id);

-- Messages: only confirmed/interested participants can read/write
CREATE POLICY "Messages to participants"  ON event_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM event_interests
    WHERE event_id = event_messages.event_id
      AND user_id = auth.uid()
      AND status IN ('interested','confirmed','attended')
  )
);
CREATE POLICY "Participants can message"  ON event_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM event_interests
    WHERE event_id = event_messages.event_id
      AND user_id = auth.uid()
      AND status IN ('interested','confirmed')
  )
);

-- Proposals
CREATE POLICY "Proposals readable by participants" ON event_setting_proposals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM event_interests
    WHERE event_id = event_setting_proposals.event_id
      AND user_id = auth.uid()
      AND status IN ('interested','confirmed')
  )
);
CREATE POLICY "Participants can propose" ON event_setting_proposals FOR INSERT WITH CHECK (
  auth.uid() = proposed_by AND
  EXISTS (
    SELECT 1 FROM event_interests
    WHERE event_id = event_setting_proposals.event_id
      AND user_id = auth.uid()
      AND status = 'confirmed'
  )
);

-- Votes
CREATE POLICY "Votes readable by participants" ON event_setting_votes FOR SELECT USING (TRUE);
CREATE POLICY "Confirmed users can vote" ON event_setting_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM event_setting_proposals esp
    JOIN event_interests ei ON ei.event_id = esp.event_id
    WHERE esp.id = event_setting_votes.proposal_id
      AND ei.user_id = auth.uid()
      AND ei.status = 'confirmed'
  )
);

-- Notifications
CREATE POLICY "Own notifications"         ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update own notifications"  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE event_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE event_interests;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_setting_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE event_setting_votes;

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
  ('Games',        'Escape Rooms',     'escape-rooms',    '🔐', 'escape_room',      90),
  ('Games',        'Dungeons & Dragons','dnd',            '🐉', 'game_store',      240),
  ('Fitness',      'Rock Climbing',    'rock-climbing',   '🧗', 'climbing_gym',    120),
  ('Fitness',      'Running',          'running',         '🏃', 'park',             60),
  ('Fitness',      'Yoga',             'yoga',            '🧘', 'yoga_studio',      75),
  ('Fitness',      'Hiking',           'hiking',          '🥾', 'park',            180),
  ('Fitness',      'Cycling',          'cycling',         '🚴', 'park',            120),
  ('Learning',     'Book Club',        'book-club',       '📖', 'library',         120),
  ('Learning',     'Language Exchange','language-exchange','🗣️','cafe',             90),
  ('Learning',     'Coding',           'coding',          '💻', 'library',         180),
  ('Learning',     'Photography',      'photography',     '📷', 'park',            180),
  ('Arts & Crafts','Painting',         'painting',        '🖌️', 'art_studio',      120),
  ('Arts & Crafts','Pottery',          'pottery',         '🏺', 'pottery_studio',  120),
  ('Music',        'Karaoke',          'karaoke',         '🎤', 'karaoke_bar',     180),
  ('Music',        'Jam Sessions',     'jam-sessions',    '🎹', 'rehearsal_space', 120),
  ('Food & Drink', 'Coffee Tasting',   'coffee',          '☕', 'cafe',             90),
  ('Food & Drink', 'Restaurant Crawl', 'restaurant-crawl','🍽️','restaurant',      180),
  ('Food & Drink', 'Cooking Class',    'cooking-class',   '👨‍🍳','cooking_school', 180),
  ('Food & Drink', 'Brewery Tour',     'brewery-tour',    '🍺', 'brewery',         150),
  ('Outdoors',     'Picnics',          'picnics',         '🧺', 'park',            120),
  ('Outdoors',     'Kayaking',         'kayaking',        '🛶', 'waterfront',      180),
  ('Wellness',     'Meditation',       'meditation',      '🧘', 'wellness_center',  60),
  ('Tech',         'Hackathon',        'hackathon',       '⚡', 'coworking_space', 480),
  ('Social',       'Networking',       'networking',      '🤝', 'coworking_space', 120),
  ('Social',       'Volunteering',     'volunteering',    '🤲', 'community_center',180)
) AS i(category, name, slug, icon, venue, duration)
ON c.name = i.category;

-- ============================================================
-- SEED DATA — Venues (Calgary)
-- ============================================================
INSERT INTO venues (name, venue_type, address, city, latitude, longitude, price_range, rating) VALUES
  ('Hexagon Board Game Cafe',    'board_game_cafe',  '203 20 Ave SW',        'Calgary', 51.0447, -114.0719, 2, 4.7),
  ('Calgary Climbing Centre',    'climbing_gym',     '220 12 Ave SW',        'Calgary', 51.0427, -114.0630, 2, 4.8),
  ('Calgary Central Library',    'library',          '800 3 St SE',          'Calgary', 51.0447, -114.0584, 1, 4.9),
  ('Last Best Brewing',          'brewery',          '607 11 Ave SW',        'Calgary', 51.0431, -114.0810, 2, 4.5),
  ('Analog Coffee',              'cafe',             '740 17 Ave SW',        'Calgary', 51.0368, -114.0787, 1, 4.6),
  ('Bow River Pathway',          'park',             'Bow River Pathway',    'Calgary', 51.0486, -114.0708, 1, 4.8),
  ('Memorial Park',              'park',             '1221 2 St SW',         'Calgary', 51.0491, -114.0812, 1, 4.5),
  ('Escape Hour Calgary',        'escape_room',      '906 16 Ave SW',        'Calgary', 51.0408, -114.0841, 3, 4.6),
  ('The Commons Calgary',        'coworking_space',  '1011 1 St SW',         'Calgary', 51.0474, -114.0637, 2, 4.4),
  ('Studio Bell',                'music_venue',      '850 4 St SE',          'Calgary', 51.0453, -114.0555, 2, 4.8),
  ('Fish Creek Park',            'park',             'Canyon Meadows Dr SW', 'Calgary', 50.9368, -114.0742, 1, 4.9),
  ('The Yoga Collective',        'yoga_studio',      '1333 8 St SW',         'Calgary', 51.0392, -114.0877, 2, 4.6);

-- ============================================================
-- SEED DATA — Open Events (for testing the MVP)
-- ============================================================
INSERT INTO events (interest_id, venue_id, created_by, title, description, proposed_start, proposed_end, threshold_count, max_attendees, status, city)
SELECT
  i.id,
  v.id,
  NULL,
  i.icon || ' ' || i.name || ' Night',
  'A casual ' || i.name || ' meetup for enthusiasts of all levels. Come hang out, share tips, and make new friends!',
  NOW() + INTERVAL '3 days' + (random() * INTERVAL '10 days'),
  NOW() + INTERVAL '3 days' + (random() * INTERVAL '10 days') + INTERVAL '3 hours',
  4,
  12,
  'open',
  'Calgary'
FROM interests i
CROSS JOIN LATERAL (
  SELECT id FROM venues WHERE venue_type = i.typical_venue LIMIT 1
) v
WHERE i.is_active = TRUE
LIMIT 15;

-- ============================================================
-- Done! Nichly MVP schema ready. 🎯
-- ============================================================
