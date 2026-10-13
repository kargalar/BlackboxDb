-- Migration: Remove Review System Completely
-- Date: 2025-12-27
-- Description: Drop all review-related tables and columns, use discussion system instead

-- Drop review-related tables in correct order (child tables first)
DROP TABLE IF EXISTS review_comment_vote CASCADE;
DROP TABLE IF EXISTS review_vote CASCADE;
DROP TABLE IF EXISTS review_comment_like CASCADE;
DROP TABLE IF EXISTS review_like CASCADE;
DROP TABLE IF EXISTS review_comment CASCADE;
DROP TABLE IF EXISTS review CASCADE;

-- Remove review-related columns from other tables
ALTER TABLE user_content_log DROP COLUMN IF EXISTS review_id;
ALTER TABLE content DROP COLUMN IF EXISTS review_count;

-- Clean up any notifications related to reviews
DELETE FROM notification WHERE review_id IS NOT NULL;
ALTER TABLE notification DROP COLUMN IF EXISTS review_id;

-- Add discussion_count to content table if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'content' AND column_name = 'discussion_count') THEN
        ALTER TABLE content ADD COLUMN discussion_count INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Update discussion_count based on existing discussions
UPDATE content
SET discussion_count = (
    SELECT COUNT(*)
    FROM discussion
    WHERE discussion.content_id = content.id
);
