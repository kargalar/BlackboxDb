-- Split book works from book publications/editions.
-- Existing book rows stay as canonical works; their current ISBN/page/publisher/cover
-- data is copied into an initial publication record.

CREATE TABLE IF NOT EXISTS "book_publication" (
    "id" SERIAL PRIMARY KEY,
    "content_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "subtitle" VARCHAR(255),
    "isbn" VARCHAR(20),
    "publisher_id" VARCHAR(255),
    "translators" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "language" VARCHAR(20),
    "page_count" INTEGER,
    "cover_url" TEXT,
    "published_date" VARCHAR(50),
    "edition_type" VARCHAR(50),
    "format" VARCHAR(50),
    "is_abridged" BOOLEAN NOT NULL DEFAULT FALSE,
    "consume_count" INTEGER NOT NULL DEFAULT 0,
    "rating_distribution" INTEGER[] NOT NULL DEFAULT ARRAY[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]::INTEGER[],
    "total_rating_score" DECIMAL(10, 2),
    "total_rating_votes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "user_content_log"
ADD COLUMN IF NOT EXISTS "book_publication_id" INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'book_publication_content_id_fkey'
    ) THEN
        ALTER TABLE "book_publication"
        ADD CONSTRAINT "book_publication_content_id_fkey"
        FOREIGN KEY ("content_id") REFERENCES "content"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'book_publication_publisher_id_fkey'
    ) THEN
        ALTER TABLE "book_publication"
        ADD CONSTRAINT "book_publication_publisher_id_fkey"
        FOREIGN KEY ("publisher_id") REFERENCES "company"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_content_log_book_publication_id_fkey'
    ) THEN
        ALTER TABLE "user_content_log"
        ADD CONSTRAINT "user_content_log_book_publication_id_fkey"
        FOREIGN KEY ("book_publication_id") REFERENCES "book_publication"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "book_publication_content_id_idx" ON "book_publication"("content_id");
CREATE INDEX IF NOT EXISTS "book_publication_publisher_id_idx" ON "book_publication"("publisher_id");
CREATE INDEX IF NOT EXISTS "book_publication_isbn_idx" ON "book_publication"("isbn");
CREATE INDEX IF NOT EXISTS "book_publication_language_idx" ON "book_publication"("language");
CREATE INDEX IF NOT EXISTS "book_publication_consume_count_idx" ON "book_publication"("consume_count");
CREATE INDEX IF NOT EXISTS "user_content_log_book_publication_id_idx" ON "user_content_log"("book_publication_id");

INSERT INTO "book_publication" (
    "content_id",
    "isbn",
    "publisher_id",
    "language",
    "page_count",
    "cover_url",
    "published_date",
    "consume_count",
    "rating_distribution",
    "total_rating_score",
    "total_rating_votes",
    "created_at",
    "updated_at"
)
SELECT
    c."id",
    c."isbn",
    (
        SELECT cc."company_id"
        FROM "content_company" cc
        WHERE cc."content_id" = c."id" AND cc."company_role_id" = 3
        ORDER BY cc."id" ASC
        LIMIT 1
    ) AS "publisher_id",
    CASE WHEN cardinality(c."languages") > 0 THEN c."languages"[1] ELSE NULL END AS "language",
    c."page_count",
    COALESCE(
        (
            SELECT ci."file_url"
            FROM "content_image" ci
            WHERE ci."id" = c."poster_image_id"
            LIMIT 1
        ),
        (
            SELECT ci."file_url"
            FROM "content_image" ci
            WHERE ci."content_id" = c."id" AND ci."type" = 'poster'
            ORDER BY ci."id" ASC
            LIMIT 1
        )
    ) AS "cover_url",
    CASE
        WHEN c."release_date" IS NOT NULL THEN c."release_date"::TEXT
        ELSE NULL
    END AS "published_date",
    c."consume_count",
    c."rating_distribution",
    c."total_rating_score",
    c."total_rating_votes",
    c."created_at",
    c."updated_at"
FROM "content" c
WHERE c."content_type_id" = 4
  AND NOT EXISTS (
      SELECT 1 FROM "book_publication" bp WHERE bp."content_id" = c."id"
  );

UPDATE "user_content_log" ucl
SET "book_publication_id" = bp."id"
FROM "content" c
JOIN LATERAL (
    SELECT bp_inner."id"
    FROM "book_publication" bp_inner
    WHERE bp_inner."content_id" = c."id"
    ORDER BY bp_inner."consume_count" DESC, bp_inner."total_rating_votes" DESC, bp_inner."id" ASC
    LIMIT 1
) bp ON TRUE
WHERE ucl."content_id" = c."id"
  AND c."content_type_id" = 4
  AND ucl."book_publication_id" IS NULL;
