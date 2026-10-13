-- Migration: Remove imdbId from content table
-- Date: 2024-12-27

-- Drop the index first if it exists
DROP INDEX IF EXISTS "content_imdb_id_idx";
DROP INDEX IF EXISTS "idx_content_imdb_id";

-- Remove the imdb_id column from content table
ALTER TABLE "content" DROP COLUMN IF EXISTS "imdb_id";
