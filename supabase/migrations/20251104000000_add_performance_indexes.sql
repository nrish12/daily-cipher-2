/*
  # Add Performance Indexes

  ## Summary
  Add database indexes to improve query performance at scale

  ## Changes
  1. Indexes for Mysteries Table
     - Compound index on date + category for daily puzzle lookups
     - Index on created_at for sorting recent mysteries

  2. Indexes for User Guesses Table
     - Compound index on user_id + created_at for user history
     - Index on mystery_id for analytics queries

  3. Indexes for Clue Effectiveness Table
     - Compound index on mystery_id + clue_index
     - Partial index for unapplied insights

  4. Indexes for AI Learning Tables
     - Index on analyzed_at for recent insights
     - Partial index for unapplied insights

  ## Performance Impact
  - Speeds up daily puzzle retrieval
  - Faster user history queries
  - Improved analytics performance
*/

-- Mysteries table indexes
CREATE INDEX IF NOT EXISTS idx_mysteries_date_category
  ON mysteries(date DESC, category);

CREATE INDEX IF NOT EXISTS idx_mysteries_created_at
  ON mysteries(created_at DESC);

-- User guesses indexes
CREATE INDEX IF NOT EXISTS idx_user_guesses_user_created
  ON user_guesses(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_guesses_mystery
  ON user_guesses(mystery_id);

CREATE INDEX IF NOT EXISTS idx_user_guesses_correct
  ON user_guesses(correct, created_at DESC)
  WHERE correct = true;

-- Clue effectiveness indexes
CREATE INDEX IF NOT EXISTS idx_clue_effectiveness_mystery_index
  ON clue_effectiveness(mystery_id, clue_index);

CREATE INDEX IF NOT EXISTS idx_clue_effectiveness_rate
  ON clue_effectiveness(success_rate DESC)
  WHERE guess_count > 10;

-- AI learning insights indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_analyzed
  ON ai_learning_insights(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_unapplied
  ON ai_learning_insights(analyzed_at DESC)
  WHERE applied = false;

CREATE INDEX IF NOT EXISTS idx_ai_insights_priority
  ON ai_learning_insights(priority DESC, analyzed_at DESC)
  WHERE applied = false;

-- Performance hint: Analyze tables after adding indexes
ANALYZE mysteries;
ANALYZE user_guesses;
ANALYZE clue_effectiveness;
ANALYZE ai_learning_insights;
