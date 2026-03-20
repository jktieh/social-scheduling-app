-- Seed interest categories and interests
-- Run in Supabase SQL Editor if the "What are you into?" step shows nothing

-- Interest categories
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
  ('Social',        '🗣️', '#f43f5e', 10)
ON CONFLICT (name) DO NOTHING;

-- Interests (matches schema.sql seed)
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
ON c.name = i.category
ON CONFLICT (slug) DO NOTHING;
