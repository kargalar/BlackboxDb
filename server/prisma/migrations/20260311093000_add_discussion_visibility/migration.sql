-- Add public/private visibility support for discussions and comments
-- Existing rows remain public so no data is lost.

ALTER TABLE "discussion"
ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE "discussion"
SET "is_public" = TRUE
WHERE "is_public" IS NULL;

CREATE INDEX IF NOT EXISTS "discussion_is_public_idx"
ON "discussion"("is_public");
