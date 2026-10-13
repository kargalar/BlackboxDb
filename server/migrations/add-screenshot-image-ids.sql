-- Add screenshot_image_ids column to content table
-- This column stores an array of ContentImage IDs for screenshots

ALTER TABLE content 
ADD COLUMN IF NOT EXISTS screenshot_image_ids INTEGER[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN content.screenshot_image_ids IS 'Array of ContentImage IDs for screenshots';
