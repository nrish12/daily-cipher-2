/*
  # Add Clue Insights to AI Learning

  Adds clue_insights column to store detailed clue effectiveness analysis

  Changes:
  - Add clue_insights JSONB column to ai_learning_insights table
  - Stores per-clue performance metrics
  - Enables AI to learn which clue positions are most effective
*/

ALTER TABLE ai_learning_insights
ADD COLUMN IF NOT EXISTS clue_insights jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ai_learning_insights.clue_insights IS
'Detailed clue effectiveness analysis including most/least effective clues, optimal reveal points, and solve distribution';
