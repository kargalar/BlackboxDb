ALTER TABLE content_screenshot
ADD COLUMN IF NOT EXISTS season_number INTEGER;

CREATE INDEX IF NOT EXISTS idx_content_screenshot_content_season
ON content_screenshot(content_id, season_number);
