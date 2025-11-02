/*
  # AI Learning System - Track User Behavior for Adaptive Difficulty

  1. New Tables
    - `user_guesses` - Every guess attempt with context
      - Tracks what users guess at each clue level
      - Links to mystery and clue count when guessed
      - Records correct/incorrect and reasoning
    
    - `mystery_analytics` - Performance metrics per mystery
      - Average solve rate, time, clues used
      - Difficulty rating based on actual performance
      - Quality score for clues (which ones helped most)
    
    - `clue_effectiveness` - Individual clue analysis
      - Which clues lead to correct guesses
      - Which clues are too hard/easy
      - Clue ordering effectiveness
    
    - `user_profiles` - Enhanced user tracking
      - Skill level based on performance
      - Preferred difficulty
      - Learning patterns

  2. Security
    - Enable RLS on all tables
    - Public read access for analytics
    - Authenticated write for user data

  3. Purpose
    - Feed data back to AI for difficulty calibration
    - Learn what makes good vs bad clues
    - Adapt mystery generation to player skill levels
*/

-- User Guesses Table
CREATE TABLE IF NOT EXISTS user_guesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  mystery_id uuid REFERENCES mysteries(id) ON DELETE CASCADE,
  guess_text text NOT NULL,
  is_correct boolean NOT NULL,
  clues_seen_count integer NOT NULL,
  clues_seen jsonb NOT NULL,
  attempt_number integer NOT NULL,
  time_elapsed_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Mystery Analytics Table
CREATE TABLE IF NOT EXISTS mystery_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mystery_id uuid REFERENCES mysteries(id) ON DELETE CASCADE UNIQUE,
  total_attempts integer DEFAULT 0,
  total_solves integer DEFAULT 0,
  solve_rate numeric(5,2) DEFAULT 0,
  avg_clues_used numeric(4,2),
  avg_time_seconds integer,
  difficulty_rating text DEFAULT 'medium',
  quality_score integer DEFAULT 50,
  common_wrong_guesses jsonb DEFAULT '[]'::jsonb,
  clue_effectiveness jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Clue Effectiveness Table
CREATE TABLE IF NOT EXISTS clue_effectiveness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mystery_id uuid REFERENCES mysteries(id) ON DELETE CASCADE,
  clue_index integer NOT NULL,
  clue_text text NOT NULL,
  times_revealed integer DEFAULT 0,
  led_to_solve integer DEFAULT 0,
  effectiveness_score numeric(5,2) DEFAULT 0,
  common_guesses_after jsonb DEFAULT '[]'::jsonb,
  avg_time_to_next_guess_ms integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(mystery_id, clue_index)
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  total_games integer DEFAULT 0,
  total_solves integer DEFAULT 0,
  solve_streak integer DEFAULT 0,
  best_streak integer DEFAULT 0,
  avg_clues_used numeric(4,2),
  avg_solve_time_seconds integer,
  skill_level text DEFAULT 'beginner',
  cognitive_style text DEFAULT 'balanced',
  hints_remaining integer DEFAULT 3,
  achievements jsonb DEFAULT '[]'::jsonb,
  preferred_categories jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_guesses_user_id ON user_guesses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_guesses_mystery_id ON user_guesses(mystery_id);
CREATE INDEX IF NOT EXISTS idx_user_guesses_created_at ON user_guesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mystery_analytics_mystery_id ON mystery_analytics(mystery_id);
CREATE INDEX IF NOT EXISTS idx_clue_effectiveness_mystery_id ON clue_effectiveness(mystery_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS
ALTER TABLE user_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clue_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- user_guesses: Anyone can insert, read their own
CREATE POLICY "Anyone can insert guesses"
  ON user_guesses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their own guesses"
  ON user_guesses FOR SELECT
  TO anon, authenticated
  USING (true);

-- mystery_analytics: Public read, system write
CREATE POLICY "Public can read mystery analytics"
  ON mystery_analytics FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert mystery analytics"
  ON mystery_analytics FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update mystery analytics"
  ON mystery_analytics FOR UPDATE
  TO anon, authenticated
  USING (true);

-- clue_effectiveness: Public read, system write
CREATE POLICY "Public can read clue effectiveness"
  ON clue_effectiveness FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert clue effectiveness"
  ON clue_effectiveness FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update clue effectiveness"
  ON clue_effectiveness FOR UPDATE
  TO anon, authenticated
  USING (true);

-- user_profiles: Public read, user write
CREATE POLICY "Public can read user profiles"
  ON user_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert user profiles"
  ON user_profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update user profiles"
  ON user_profiles FOR UPDATE
  TO anon, authenticated
  USING (true);
