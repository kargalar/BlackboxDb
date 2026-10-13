-- Add type column to discussion table
-- This allows distinguishing between discussions (with title) and comments (without title)

-- AlterTable: Add type column with default value 'discussion'
ALTER TABLE "discussion" ADD COLUMN IF NOT EXISTS "type" VARCHAR(20) NOT NULL DEFAULT 'discussion';

-- AlterTable: Make title column nullable for comments
ALTER TABLE "discussion" ALTER COLUMN "title" DROP NOT NULL;

-- Update existing records to ensure they have type='discussion'
UPDATE "discussion" SET "type" = 'discussion' WHERE "type" IS NULL;

-- CreateIndex: Add index on type column for efficient filtering
CREATE INDEX IF NOT EXISTS "discussion_type_idx" ON "discussion"("type");
