-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- Users can select and update their own profile
-- ============================================================
CREATE POLICY select_own_profiles ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY update_own_profiles ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- INTEREST CATEGORIES
-- Public table (all users can read)
-- ============================================================
CREATE POLICY select_interest_categories ON interest_categories
  FOR SELECT USING (true);

-- ============================================================
-- INTERESTS
-- ============================================================
CREATE POLICY select_active_interests ON interests
  FOR SELECT USING (is_active = true);

-- ============================================================
-- USER INTERESTS
-- ============================================================
CREATE POLICY select_own_user_interests ON user_interests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_own_user_interests ON user_interests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_user_interests ON user_interests
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY delete_own_user_interests ON user_interests
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- AVAILABILITY
-- ============================================================
CREATE POLICY select_own_availability ON availability
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_own_availability ON availability
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_availability ON availability
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY delete_own_availability ON availability
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- VENUES
-- Public table (all users can read)
-- ============================================================
CREATE POLICY select_venues ON venues
  FOR SELECT USING (true);

-- ============================================================
-- EVENTS
-- Users can see all public events or their own events
-- ============================================================
CREATE POLICY select_events ON events
  FOR SELECT USING (is_public = true OR host_id = auth.uid());

CREATE POLICY insert_own_events ON events
  FOR INSERT WITH CHECK (host_id = auth.uid());

CREATE POLICY update_own_events ON events
  FOR UPDATE USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE POLICY delete_own_events ON events
  FOR DELETE USING (host_id = auth.uid());

-- ============================================================
-- EVENT ATTENDEES
-- Users can manage their own RSVP
-- ============================================================
CREATE POLICY select_own_event_attendees ON event_attendees
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_own_event_attendees ON event_attendees
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_event_attendees ON event_attendees
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY delete_own_event_attendees ON event_attendees
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- USER MATCHES
-- Users can see matches involving themselves
-- ============================================================
CREATE POLICY select_own_user_matches ON user_matches
  FOR SELECT USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

CREATE POLICY insert_own_user_matches ON user_matches
  FOR INSERT WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

CREATE POLICY update_own_user_matches ON user_matches
  FOR UPDATE USING (user_a_id = auth.uid() OR user_b_id = auth.uid())
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

CREATE POLICY delete_own_user_matches ON user_matches
  FOR DELETE USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- ============================================================
-- USER BLOCKS
-- Users can manage blocks they created
-- ============================================================
CREATE POLICY select_own_user_blocks ON user_blocks
  FOR SELECT USING (blocker_id = auth.uid());

CREATE POLICY insert_own_user_blocks ON user_blocks
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

CREATE POLICY update_own_user_blocks ON user_blocks
  FOR UPDATE USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY delete_own_user_blocks ON user_blocks
  FOR DELETE USING (blocker_id = auth.uid());

-- ============================================================
-- USER REPORTS
-- Users can see reports they created
-- ============================================================
CREATE POLICY select_own_user_reports ON user_reports
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY insert_own_user_reports ON user_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY update_own_user_reports ON user_reports
  FOR UPDATE USING (reporter_id = auth.uid())
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY delete_own_user_reports ON user_reports
  FOR DELETE USING (reporter_id = auth.uid());

-- ============================================================
-- EVENT MESSAGES
-- Users can see and manage their own messages
-- ============================================================
CREATE POLICY select_own_event_messages ON event_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_own_event_messages ON event_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_event_messages ON event_messages
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY delete_own_event_messages ON event_messages
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS
-- Users can only see their own notifications
-- ============================================================
CREATE POLICY select_own_notifications ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY insert_own_notifications ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY update_own_notifications ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY delete_own_notifications ON notifications
  FOR DELETE USING (user_id = auth.uid());