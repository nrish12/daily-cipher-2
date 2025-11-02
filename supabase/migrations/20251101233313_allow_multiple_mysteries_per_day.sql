/*
  # Allow Multiple Mysteries Per Day (One Per Category)

  1. Changes
    - Drop the unique constraint on `date` column
    - Add a composite unique constraint on `date + category` to ensure one mystery per category per day
    - This allows person, place, and thing mysteries to exist for the same day

  2. Purpose
    - Enable users to play different category types on the same day
    - Each category gets its own unique mystery per day
*/

-- Drop old constraint
ALTER TABLE mysteries DROP CONSTRAINT IF EXISTS mysteries_date_key;

-- Add composite unique constraint for date + category
ALTER TABLE mysteries ADD CONSTRAINT mysteries_date_category_unique UNIQUE (date, category);
