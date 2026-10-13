-- Add missing columns to content table
BEGIN;

ALTER TABLE content ADD COLUMN IF NOT EXISTS isbn VARCHAR(20);
ALTER TABLE content ADD COLUMN IF NOT EXISTS page_count INT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS is_continuing BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS content_isbn_idx ON content(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_is_continuing_idx ON content(is_continuing);

COMMIT;
