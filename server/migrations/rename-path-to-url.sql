-- Rename path columns to url columns
BEGIN;

-- Content table
ALTER TABLE content RENAME COLUMN poster_path TO poster_url;
ALTER TABLE content RENAME COLUMN backdrop_path TO backdrop_url;

-- Verify columns were renamed
DO $$
BEGIN
    RAISE NOTICE 'Columns renamed: poster_path -> poster_url, backdrop_path -> backdrop_url';
END $$;

COMMIT;
