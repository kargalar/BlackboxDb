-- Prevent future active-content duplicates while preserving soft-deleted history.
CREATE UNIQUE INDEX "content_active_tmdb_type_unique"
ON "content" ("tmdb_id", "content_type_id")
WHERE "tmdb_id" IS NOT NULL AND "is_deleted" = false;

CREATE UNIQUE INDEX "content_active_igdb_type_unique"
ON "content" ("igdb_id", "content_type_id")
WHERE "igdb_id" IS NOT NULL AND "is_deleted" = false;
