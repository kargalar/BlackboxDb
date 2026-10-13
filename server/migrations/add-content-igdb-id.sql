ALTER TABLE content
ADD COLUMN IF NOT EXISTS igdb_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_content_igdb_id
ON content (igdb_id);