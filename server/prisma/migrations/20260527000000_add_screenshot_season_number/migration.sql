ALTER TABLE "content_screenshot"
ADD COLUMN IF NOT EXISTS "season_number" INTEGER;

CREATE INDEX IF NOT EXISTS "content_screenshot_content_id_season_number_idx"
ON "content_screenshot"("content_id", "season_number");
