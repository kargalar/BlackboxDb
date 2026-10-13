-- Migration: Replace content_status_id with is_consumed
-- Date: 2025-10-12
-- Purpose: Simplify user content log - use boolean instead of lookup table

-- 1. Add is_consumed column
ALTER TABLE user_content_log 
ADD COLUMN IF NOT EXISTS is_consumed BOOLEAN DEFAULT FALSE;

-- 2. Migrate existing data (content_status_id = 1 means consumed)
UPDATE user_content_log 
SET is_consumed = TRUE 
WHERE content_status_id = 1;

-- 3. Drop the old column
ALTER TABLE user_content_log 
DROP COLUMN IF EXISTS content_status_id;

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_content_log_is_consumed 
ON user_content_log(is_consumed) 
WHERE is_consumed = TRUE;

-- 5. Add composite index for user + consumed queries
CREATE INDEX IF NOT EXISTS idx_user_content_log_user_consumed 
ON user_content_log(user_id, is_consumed) 
WHERE is_consumed = TRUE;

-- Update comment
COMMENT ON COLUMN user_content_log.is_consumed IS 'User has consumed (watched/read/played) this content';
