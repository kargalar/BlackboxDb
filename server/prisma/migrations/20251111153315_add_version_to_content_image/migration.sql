-- DropIndex
DROP INDEX IF EXISTS "public"."content_budget_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_first_air_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_published_date_idx";

-- AlterTable
ALTER TABLE "content_image" ADD COLUMN     "version" VARCHAR(50) NOT NULL DEFAULT 'original';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_image_version_idx" ON "content_image"("version");
