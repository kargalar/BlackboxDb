-- ======================================
-- Quiz Per-Level Points Migration
-- Replace 3-tier (easy/medium/hard) with 5 individual level points
-- ======================================

-- Add new per-level columns
ALTER TABLE quiz_settings ADD COLUMN IF NOT EXISTS points_level1 INTEGER DEFAULT 10;
ALTER TABLE quiz_settings ADD COLUMN IF NOT EXISTS points_level2 INTEGER DEFAULT 15;
ALTER TABLE quiz_settings ADD COLUMN IF NOT EXISTS points_level3 INTEGER DEFAULT 25;
ALTER TABLE quiz_settings ADD COLUMN IF NOT EXISTS points_level4 INTEGER DEFAULT 40;
ALTER TABLE quiz_settings ADD COLUMN IF NOT EXISTS points_level5 INTEGER DEFAULT 50;

-- Migrate existing data from old 3-tier columns
UPDATE quiz_settings SET
  points_level1 = COALESCE(points_easy, 10),
  points_level2 = COALESCE(points_easy, 10),
  points_level3 = COALESCE(points_medium, 25),
  points_level4 = COALESCE(points_medium, 25),
  points_level5 = COALESCE(points_hard, 50);

-- Drop old columns
ALTER TABLE quiz_settings DROP COLUMN IF EXISTS points_easy;
ALTER TABLE quiz_settings DROP COLUMN IF EXISTS points_medium;
ALTER TABLE quiz_settings DROP COLUMN IF EXISTS points_hard;
