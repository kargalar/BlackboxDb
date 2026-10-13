-- Phase 2: Merge ContentDetail into Content Table
-- This migration moves all fields from content_detail into content table
-- and removes the content_detail table

-- Step 1: Add all content_detail columns to content table
ALTER TABLE "content" 
ADD COLUMN IF NOT EXISTS "collection_name" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "budget" BIGINT,
ADD COLUMN IF NOT EXISTS "revenue" BIGINT,
ADD COLUMN IF NOT EXISTS "episode_run_time" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN IF NOT EXISTS "number_of_episodes" INTEGER,
ADD COLUMN IF NOT EXISTS "number_of_seasons" INTEGER,
ADD COLUMN IF NOT EXISTS "tv_type" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "in_production" BOOLEAN,
ADD COLUMN IF NOT EXISTS "first_air_date" DATE,
ADD COLUMN IF NOT EXISTS "last_air_date" DATE,
ADD COLUMN IF NOT EXISTS "subtitle" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "publisher" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "published_date" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "maturity_rating" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "language" VARCHAR(10),
ADD COLUMN IF NOT EXISTS "book_series" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "book_series_number" INTEGER,
ADD COLUMN IF NOT EXISTS "preview_link" TEXT,
ADD COLUMN IF NOT EXISTS "info_link" TEXT,
ADD COLUMN IF NOT EXISTS "canonical_volume_link" TEXT,
ADD COLUMN IF NOT EXISTS "game_category" INTEGER,
ADD COLUMN IF NOT EXISTS "storyline" TEXT,
ADD COLUMN IF NOT EXISTS "summary" TEXT,
ADD COLUMN IF NOT EXISTS "version_title" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "version_parent" INTEGER,
ADD COLUMN IF NOT EXISTS "collection" INTEGER,
ADD COLUMN IF NOT EXISTS "game_modes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "perspectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "game_franchise" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "game_series" VARCHAR(255);

-- Step 2: Copy data from content_detail to content
UPDATE "content" AS c
SET
  "collection_name" = cd."collection_name",
  "budget" = cd."budget",
  "revenue" = cd."revenue",
  "episode_run_time" = cd."episode_run_time",
  "number_of_episodes" = cd."number_of_episodes",
  "number_of_seasons" = cd."number_of_seasons",
  "tv_type" = cd."type",
  "in_production" = cd."in_production",
  "first_air_date" = cd."first_air_date",
  "last_air_date" = cd."last_air_date",
  "subtitle" = cd."subtitle",
  "authors" = cd."authors",
  "publisher" = cd."publisher",
  "published_date" = cd."published_date",
  "categories" = cd."categories",
  "maturity_rating" = cd."maturity_rating",
  "language" = cd."language",
  "book_series" = cd."book_series",
  "book_series_number" = cd."book_series_number",
  "preview_link" = cd."preview_link",
  "info_link" = cd."info_link",
  "canonical_volume_link" = cd."canonical_volume_link",
  "game_category" = cd."category",
  "storyline" = cd."storyline",
  "summary" = cd."summary",
  "version_title" = cd."version_title",
  "version_parent" = cd."version_parent",
  "collection" = cd."collection",
  "game_modes" = cd."game_modes",
  "perspectives" = cd."perspectives",
  "themes" = cd."themes",
  "game_franchise" = cd."game_franchise",
  "game_series" = cd."game_series"
FROM "content_detail" AS cd
WHERE c."id" = cd."content_id";

-- Step 3: Update tv_season references from content_detail to content
UPDATE "tv_season" 
SET "tv_show_id" = "tv_show_id"
WHERE "tv_show_id" IS NOT NULL;

-- Step 4: Drop foreign key constraints from content_detail
ALTER TABLE "tv_season" DROP CONSTRAINT IF EXISTS "tv_season_tvShowId_fkey";
ALTER TABLE "tv_episode" DROP CONSTRAINT IF EXISTS "tv_episode_tvShowId_fkey";

-- Step 5: Update tv_season and tv_episode to reference content directly
ALTER TABLE "tv_season"
DROP CONSTRAINT IF EXISTS "tv_season_tvShowId_fkey",
ADD CONSTRAINT "tv_season_tvShowId_fkey" 
  FOREIGN KEY ("tv_show_id") 
  REFERENCES "content" ("id") 
  ON DELETE CASCADE;

ALTER TABLE "tv_episode"
DROP CONSTRAINT IF EXISTS "tv_episode_tvShowId_fkey",
ADD CONSTRAINT "tv_episode_tvShowId_fkey"
  FOREIGN KEY ("tv_show_id")
  REFERENCES "content" ("id")
  ON DELETE CASCADE;

-- Step 6: Drop the content_detail table
DROP TABLE IF EXISTS "content_detail" CASCADE;

-- Step 7: Add index for new columns
CREATE INDEX IF NOT EXISTS "content_first_air_date_idx" ON "content"("first_air_date");
CREATE INDEX IF NOT EXISTS "content_published_date_idx" ON "content"("published_date");
CREATE INDEX IF NOT EXISTS "content_budget_idx" ON "content"("budget");

-- Done
