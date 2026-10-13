ALTER TABLE "app_user"
ADD COLUMN IF NOT EXISTS "preferred_game_platform_ids" INTEGER[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "split_home_popular_sections" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "app_user"
SET "preferred_game_platform_ids" = ARRAY["preferred_game_platform_id"]
WHERE "preferred_game_platform_id" IS NOT NULL
  AND ("preferred_game_platform_ids" IS NULL OR cardinality("preferred_game_platform_ids") = 0);
