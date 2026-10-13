ALTER TABLE content
ADD COLUMN IF NOT EXISTS tmdb_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_content_tmdb_id
ON content (tmdb_id);