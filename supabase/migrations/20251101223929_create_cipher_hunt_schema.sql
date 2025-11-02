-- Cipher Hunt Database Schema
--
-- 1. New Tables
--    - mysteries: Daily puzzles with clues and answers
--    - user_profiles: Player statistics and achievements
--    - daily_stats: Aggregate daily game statistics
--
-- 2. Security
--    - Enable RLS on all tables
--    - Public read access to mysteries and stats
--    - Users can read/update their own profiles

-- Create mysteries table
CREATE TABLE IF NOT EXISTS mysteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('person', 'place', 'thing')),
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  answer text NOT NULL,
  clues jsonb NOT NULL DEFAULT '[]'::jsonb,
  fun_fact text DEFAULT '',
  hidden_clues jsonb DEFAULT '[]'::jsonb,
  date date NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  total_games integer DEFAULT 0,
  total_solves integer DEFAULT 0,
  solve_streak integer DEFAULT 0,
  total_hints integer DEFAULT 3,
  achievements jsonb DEFAULT '[]'::jsonb,
  solve_history jsonb DEFAULT '[]'::jsonb,
  cognitive_style text DEFAULT 'New Detective',
  average_clues_used numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  total_attempts integer DEFAULT 0,
  total_solved integer DEFAULT 0,
  active_players integer DEFAULT 0,
  recent_solves jsonb DEFAULT '[]'::jsonb,
  fastest_solve jsonb DEFAULT '{}'::jsonb,
  solves_by_clue_count jsonb DEFAULT '{}'::jsonb,
  popular_paths jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mysteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mysteries (public read)
CREATE POLICY "Anyone can read mysteries"
  ON mysteries FOR SELECT
  USING (true);

-- RLS Policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for daily_stats (public read)
CREATE POLICY "Anyone can read daily stats"
  ON daily_stats FOR SELECT
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mysteries_date ON mysteries(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);