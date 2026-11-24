ALTER TABLE content_screenshot ADD COLUMN IF NOT EXISTS episode_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_content_screenshot_content_season_episode ON content_screenshot(content_id, season_number, episode_number);
