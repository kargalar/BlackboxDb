-- Add discussion_count column to content table
-- This replaces the removed review_count column

-- Add the column
ALTER TABLE content ADD COLUMN IF NOT EXISTS discussion_count INTEGER DEFAULT 0;

-- Update discussion counts based on actual discussions linked to content
UPDATE content
SET discussion_count = (
  SELECT COUNT(*)
  FROM discussion
  WHERE discussion.content_id = content.id
);

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'discussion_count column added and values updated';
END $$;
