ALTER TABLE "book_publication"
  ADD COLUMN IF NOT EXISTS "is_original" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "book_publication" bp
SET "is_original" = TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM "book_publication" existing
  WHERE existing."content_id" = bp."content_id"
    AND existing."is_original" = TRUE
)
AND bp."id" = (
  SELECT first_bp."id"
  FROM "book_publication" first_bp
  WHERE first_bp."content_id" = bp."content_id"
  ORDER BY first_bp."created_at" ASC, first_bp."id" ASC
  LIMIT 1
);

CREATE INDEX IF NOT EXISTS "book_publication_content_id_is_original_idx"
  ON "book_publication"("content_id", "is_original");

ALTER TABLE "user_content_log"
  ADD COLUMN IF NOT EXISTS "book_format" VARCHAR(20);
