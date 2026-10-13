-- ======================================
-- Language/Franchise Refactor Migration
-- ======================================

-- Step 1: Rename ContentSeries to Franchise
ALTER TABLE "content_series" RENAME TO "franchise";

-- Step 2: Rename seriesId to franchiseId in Content table
ALTER TABLE "content" RENAME COLUMN "series_id" TO "franchise_id";

-- Step 3: Add languages array to Content table (for simple language storage)
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT '{}';

-- Step 4: Migrate data from ContentLanguage to Content.languages
-- (Only migrate 'original' language role for simplicity)
UPDATE "content" c
SET "languages" = ARRAY(
  SELECT l."iso_code"
  FROM "content_language" cl
  JOIN "language" l ON cl."language_id" = l.id
  WHERE cl."content_id" = c.id AND cl."role" = 'original'
)
WHERE EXISTS (
  SELECT 1 FROM "content_language" WHERE "content_id" = c.id
);

-- Step 5: Drop ContentLanguage table
DROP TABLE IF EXISTS "content_language";

-- Step 6: Create index on franchise_id
CREATE INDEX IF NOT EXISTS "content_franchise_id_idx" ON "content"("franchise_id");

-- Step 7: Update foreign key constraint name
-- (Prisma will handle this automatically on next migration)

