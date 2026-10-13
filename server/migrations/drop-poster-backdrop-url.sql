-- Drop poster_url and backdrop_url from content table
-- These are now stored in content_image table
ALTER TABLE content DROP COLUMN IF EXISTS poster_url;
ALTER TABLE content DROP COLUMN IF EXISTS backdrop_url;
