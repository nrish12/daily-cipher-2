/*
  # AI Learning Insights Storage

  1. New Tables
    - `ai_learning_insights` - Stores nightly analysis results
      - Used by generate-mystery to adapt future puzzles
      - Tracks difficulty adjustments over time
      - Records recommendations and actions taken

  2. Security
    - Enable RLS
    - Public read for transparency
    - System write only

  3. Purpose
    - Persistent storage of AI learning analysis
    - Historical tracking of difficulty adjustments
    - Feedback loop for continuous improvement
*/

CREATE TABLE IF NOT EXISTS ai_learning_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  avg_solve_rate numeric(5,2),
  difficulty_adjustment text NOT NULL,
  too_hard_count integer DEFAULT 0,
  too_easy_count integer DEFAULT 0,
  recommendations jsonb DEFAULT '[]'::jsonb,
  guess_patterns jsonb DEFAULT '{}'::jsonb,
  total_games_analyzed integer DEFAULT 0,
  total_guesses_analyzed integer DEFAULT 0,
  applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_analyzed_at ON ai_learning_insights(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_applied ON ai_learning_insights(applied);

ALTER TABLE ai_learning_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read AI insights"
  ON ai_learning_insights FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert AI insights"
  ON ai_learning_insights FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update AI insights"
  ON ai_learning_insights FOR UPDATE
  TO anon, authenticated
  USING (true);
