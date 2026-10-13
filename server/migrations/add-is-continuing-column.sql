-- Migration: Add is_continuing column to user_content_log table
-- Date: 2025-01-XX
-- Purpose: Add "Continuing/In Progress" status for user content (games, books, TV shows, movies)
-- Pattern: Same as is_favorite and is_consume_later

-- Add is_continuing column
ALTER TABLE user_content_log 
ADD COLUMN IF NOT EXISTS is_continuing BOOLEAN DEFAULT FALSE;

-- Add index for performance (queries filtering by is_continuing)
CREATE INDEX IF NOT EXISTS idx_user_content_log_is_continuing 
ON user_content_log(is_continuing);

-- Add composite index for user + continuing queries
CREATE INDEX IF NOT EXISTS idx_user_content_log_user_continuing 
ON user_content_log(user_id, is_continuing) 
WHERE is_continuing = TRUE;

-- Update comment
COMMENT ON COLUMN user_content_log.is_continuing IS 'User marked this content as currently continuing/in progress';
