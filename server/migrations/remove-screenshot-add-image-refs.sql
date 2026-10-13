-- Migration: Remove ContentScreenshot, Add poster/backdrop to ContentImage, Add image refs to Content
-- Date: 2024-12-05

-- Step 1: Add screenshot fields to ContentImage (reusing existing table)
ALTER TABLE content_image 
ADD COLUMN IF NOT EXISTS difficulty INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS "order" INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_enabled_for_quiz BOOLEAN DEFAULT false;

-- Step 2: Migrate existing screenshots to content_image
INSERT INTO content_image (content_id, type, version, file_url, is_primary, difficulty, "order", description, is_enabled_for_quiz)
SELECT content_id, 'screenshot', 'original', image_url, false, difficulty, "order", description, is_enabled_for_quiz
FROM content_screenshot
ON CONFLICT DO NOTHING;

-- Step 3: Add posterImageId and backdropImageId to Content table
ALTER TABLE content
ADD COLUMN IF NOT EXISTS poster_image_id INT,
ADD COLUMN IF NOT EXISTS backdrop_image_id INT;

-- Step 4: Create ContentImage records for existing posters
INSERT INTO content_image (content_id, type, version, file_url, is_primary)
SELECT id, 'poster', 'original', poster_url, true
FROM content
WHERE poster_url IS NOT NULL AND poster_url != ''
ON CONFLICT DO NOTHING;

-- Step 5: Create ContentImage records for existing backdrops
INSERT INTO content_image (content_id, type, version, file_url, is_primary)
SELECT id, 'backdrop', 'original', backdrop_url, true
FROM content
WHERE backdrop_url IS NOT NULL AND backdrop_url != ''
ON CONFLICT DO NOTHING;

-- Step 6: Update content table with poster image ids
UPDATE content c
SET poster_image_id = ci.id
FROM content_image ci
WHERE ci.content_id = c.id 
AND ci.type = 'poster' 
AND ci.is_primary = true;

-- Step 7: Update content table with backdrop image ids  
UPDATE content c
SET backdrop_image_id = ci.id
FROM content_image ci
WHERE ci.content_id = c.id 
AND ci.type = 'backdrop' 
AND ci.is_primary = true;

-- Step 8: Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_content_poster_image ON content(poster_image_id);
CREATE INDEX IF NOT EXISTS idx_content_backdrop_image ON content(backdrop_image_id);
CREATE INDEX IF NOT EXISTS idx_content_image_difficulty ON content_image(difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_image_quiz ON content_image(is_enabled_for_quiz) WHERE is_enabled_for_quiz = true;

-- Step 9: Drop the old screenshot table (after verifying migration)
-- Uncomment when ready:
-- DROP TABLE IF EXISTS content_screenshot;

-- Step 10: Drop old columns from content (after verifying)
-- Uncomment when ready:
-- ALTER TABLE content DROP COLUMN IF EXISTS poster_url;
-- ALTER TABLE content DROP COLUMN IF EXISTS backdrop_url;

-- Note: Run the DROP statements manually after verifying all data migrated correctly
