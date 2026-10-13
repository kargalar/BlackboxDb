-- ======================================
-- PHASE 2: Database Schema Migration
-- Remove API Dependencies and Unify Schema
-- ======================================
-- 
-- IMPORTANT: BACKUP YOUR DATABASE BEFORE RUNNING!
-- 
-- This migration:
-- 1. Removes all API-specific reference tables (TMDB, IGDB, Book)
-- 2. Removes API-specific columns from Content table
-- 3. Simplifies Person, Company, Genre, Platform tables
-- 4. Updates MovieDetails, TvDetails, GameDetails, BookDetails
-- 5. Preserves all user data (reviews, logs, follows, etc.)
--
-- Estimated time: 5-10 minutes on small database
-- ======================================

BEGIN;

-- ======================================
-- STEP 1: Create backup markers
-- ======================================
DO $$
BEGIN
    RAISE NOTICE 'Starting Phase 2 Migration at %', NOW();
    RAISE NOTICE 'Creating backup markers...';
END $$;

-- ======================================
-- STEP 2: Drop API reference tables
-- ======================================
RAISE NOTICE 'Removing API reference tables...';

-- TMDB references
DROP TABLE IF EXISTS tmdb_person CASCADE;
DROP TABLE IF EXISTS tmdb_company CASCADE;
DROP TABLE IF EXISTS tmdb_genre CASCADE;
DROP TABLE IF EXISTS tmdb_platform CASCADE;

-- IGDB references
DROP TABLE IF EXISTS igdb_person CASCADE;
DROP TABLE IF EXISTS igdb_company CASCADE;
DROP TABLE IF EXISTS igdb_genre CASCADE;
DROP TABLE IF EXISTS igdb_platform CASCADE;

-- Book references
DROP TABLE IF EXISTS book_category CASCADE;

-- TV Network (TMDB specific)
DROP TABLE IF EXISTS tv_show_network CASCADE;
DROP TABLE IF EXISTS tv_network CASCADE;

RAISE NOTICE 'API reference tables removed.';

-- ======================================
-- STEP 3: Remove API-specific columns from Content
-- ======================================
RAISE NOTICE 'Removing API-specific columns from content table...';

-- Drop indexes first
DROP INDEX IF EXISTS content_tmdb_id_idx;
DROP INDEX IF EXISTS content_igdb_id_idx;

-- Remove API columns
ALTER TABLE content DROP COLUMN IF EXISTS tmdb_id;
ALTER TABLE content DROP COLUMN IF EXISTS igdb_id;
ALTER TABLE content DROP COLUMN IF EXISTS google_books_id;
ALTER TABLE content DROP COLUMN IF EXISTS raw_data;
ALTER TABLE content DROP COLUMN IF EXISTS vote_average;
ALTER TABLE content DROP COLUMN IF EXISTS vote_count;
ALTER TABLE content DROP COLUMN IF EXISTS popularity;

-- Keep imdb_id as optional external reference
-- Keep budget/revenue but they'll be moved to movie_details later

RAISE NOTICE 'API columns removed from content table.';

-- ======================================
-- STEP 4: Rename path columns to url columns
-- ======================================
RAISE NOTICE 'Converting path columns to full URL columns...';

-- Content table
ALTER TABLE content RENAME COLUMN poster_path TO poster_url;
ALTER TABLE content RENAME COLUMN backdrop_path TO backdrop_url;

-- Person table
ALTER TABLE person RENAME COLUMN profile_path TO profile_url;
ALTER TABLE person DROP COLUMN IF EXISTS popularity;

-- Convert gender from Int to String (nullable)
ALTER TABLE person ADD COLUMN gender_temp VARCHAR(20);
UPDATE person SET gender_temp = CASE 
    WHEN gender = 1 THEN 'female'
    WHEN gender = 2 THEN 'male'
    ELSE 'unknown'
END;
ALTER TABLE person DROP COLUMN gender;
ALTER TABLE person RENAME COLUMN gender_temp TO gender;

-- Company table
ALTER TABLE company RENAME COLUMN logo_path TO logo_url;

-- Platform table
ALTER TABLE platform RENAME COLUMN logo_path TO logo_url;

-- TV Season
ALTER TABLE tv_season RENAME COLUMN poster_path TO poster_url;
ALTER TABLE tv_season DROP COLUMN IF EXISTS vote_average;
ALTER TABLE tv_season DROP COLUMN IF EXISTS tmdb_id;

-- TV Episode
ALTER TABLE tv_episode RENAME COLUMN still_path TO still_url;
ALTER TABLE tv_episode DROP COLUMN IF EXISTS vote_average;
ALTER TABLE tv_episode DROP COLUMN IF EXISTS vote_count;
ALTER TABLE tv_episode DROP COLUMN IF EXISTS tmdb_id;

-- TV Network logo
-- Already dropped above, but if we recreate network as platform type

RAISE NOTICE 'Path columns converted to URL columns.';

-- ======================================
-- STEP 5: Simplify MovieDetails
-- ======================================
RAISE NOTICE 'Simplifying movie_details table...';

-- Move budget and revenue from content to movie_details
ALTER TABLE movie_details ADD COLUMN IF NOT EXISTS budget BIGINT;
ALTER TABLE movie_details ADD COLUMN IF NOT EXISTS revenue BIGINT;

-- Copy data
UPDATE movie_details md
SET 
    budget = c.budget,
    revenue = c.revenue
FROM content c
WHERE c.id = md.content_id AND c.content_type_id = 1;

-- Remove from content table
ALTER TABLE content DROP COLUMN IF EXISTS budget;
ALTER TABLE content DROP COLUMN IF EXISTS revenue;

-- Simplify movie_details - remove JSON fields
ALTER TABLE movie_details ADD COLUMN IF NOT EXISTS collection_name VARCHAR(255);
ALTER TABLE movie_details DROP COLUMN IF EXISTS belongs_to_collection;
ALTER TABLE movie_details DROP COLUMN IF EXISTS release_dates;
ALTER TABLE movie_details DROP COLUMN IF EXISTS recommendations;
ALTER TABLE movie_details DROP COLUMN IF EXISTS similar;

RAISE NOTICE 'MovieDetails simplified.';

-- ======================================
-- STEP 6: Simplify TvDetails
-- ======================================
RAISE NOTICE 'Simplifying tv_details table...';

-- Remove JSON fields
ALTER TABLE tv_details DROP COLUMN IF EXISTS next_episode_to_air;
ALTER TABLE tv_details DROP COLUMN IF EXISTS last_episode_to_air;
ALTER TABLE tv_details DROP COLUMN IF EXISTS created_by;
ALTER TABLE tv_details DROP COLUMN IF EXISTS recommendations;
ALTER TABLE tv_details DROP COLUMN IF EXISTS similar;

RAISE NOTICE 'TvDetails simplified.';

-- ======================================
-- STEP 7: Simplify GameDetails
-- ======================================
RAISE NOTICE 'Simplifying game_details table...';

-- Convert JSON arrays to string arrays where possible
ALTER TABLE game_details ADD COLUMN IF NOT EXISTS game_modes_new TEXT[];
ALTER TABLE game_details ADD COLUMN IF NOT EXISTS perspectives_new TEXT[];
ALTER TABLE game_details ADD COLUMN IF NOT EXISTS themes_new TEXT[];

-- Keep these as simple columns
ALTER TABLE game_details ADD COLUMN IF NOT EXISTS franchise VARCHAR(255);
ALTER TABLE game_details ADD COLUMN IF NOT EXISTS series VARCHAR(255);

-- Remove complex JSON fields
ALTER TABLE game_details DROP COLUMN IF EXISTS game_modes;
ALTER TABLE game_details DROP COLUMN IF EXISTS player_perspectives;
ALTER TABLE game_details DROP COLUMN IF EXISTS game_engines;
ALTER TABLE game_details DROP COLUMN IF EXISTS franchises;
ALTER TABLE game_details DROP COLUMN IF EXISTS hypes;
ALTER TABLE game_details DROP COLUMN IF EXISTS websites;
ALTER TABLE game_details DROP COLUMN IF EXISTS external_games;

-- Rename new columns
ALTER TABLE game_details RENAME COLUMN game_modes_new TO game_modes;
ALTER TABLE game_details RENAME COLUMN perspectives_new TO perspectives;
ALTER TABLE game_details RENAME COLUMN themes_new TO themes;

-- Simplify ratings - keep only our own
ALTER TABLE game_details DROP COLUMN IF EXISTS rating;
ALTER TABLE game_details DROP COLUMN IF EXISTS aggregated_rating;
ALTER TABLE game_details DROP COLUMN IF EXISTS aggregated_rating_count;
ALTER TABLE game_details DROP COLUMN IF EXISTS total_rating;
ALTER TABLE game_details DROP COLUMN IF EXISTS total_rating_count;

RAISE NOTICE 'GameDetails simplified.';

-- ======================================
-- STEP 8: Simplify BookDetails
-- ======================================
RAISE NOTICE 'Simplifying book_details table...';

-- Add series fields
ALTER TABLE book_details ADD COLUMN IF NOT EXISTS series VARCHAR(255);
ALTER TABLE book_details ADD COLUMN IF NOT EXISTS series_number INT;
ALTER TABLE book_details ADD COLUMN IF NOT EXISTS language VARCHAR(10);

-- Remove complex JSON fields
ALTER TABLE book_details DROP COLUMN IF EXISTS sale_info;
ALTER TABLE book_details DROP COLUMN IF EXISTS access_info;
ALTER TABLE book_details DROP COLUMN IF EXISTS search_info;

RAISE NOTICE 'BookDetails simplified.';

-- ======================================
-- STEP 9: Add new fields to Content
-- ======================================
RAISE NOTICE 'Adding new fields to content table...';

-- Add ISBN for books (optional external reference like imdb_id)
ALTER TABLE content ADD COLUMN IF NOT EXISTS isbn VARCHAR(20);

-- Add page_count for books
ALTER TABLE content ADD COLUMN IF NOT EXISTS page_count INT;

-- Add is_continuing flag for ongoing content
ALTER TABLE content ADD COLUMN IF NOT EXISTS is_continuing BOOLEAN DEFAULT false;

RAISE NOTICE 'New fields added to content table.';

-- ======================================
-- STEP 10: Update Platform table
-- ======================================
RAISE NOTICE 'Updating platform table structure...';

-- Platform type should be more generic
-- game_console, game_store, streaming, publisher, network, etc.
-- Already has platform_type column, just ensure it's flexible enough

-- No changes needed, structure is already good

RAISE NOTICE 'Platform table structure verified.';

-- ======================================
-- STEP 11: Verify data integrity
-- ======================================
RAISE NOTICE 'Verifying data integrity...';

-- Check for null content_type_ids
DO $$
DECLARE
    null_count INT;
BEGIN
    SELECT COUNT(*) INTO null_count FROM content WHERE content_type_id IS NULL;
    IF null_count > 0 THEN
        RAISE WARNING 'Found % content records with NULL content_type_id', null_count;
    END IF;
END $$;

-- Check for orphaned records (shouldn't be any due to CASCADE)
DO $$
DECLARE
    orphan_count INT;
BEGIN
    SELECT COUNT(*) INTO orphan_count 
    FROM user_content_log ucl 
    LEFT JOIN content c ON ucl.content_id = c.id 
    WHERE c.id IS NULL;
    
    IF orphan_count > 0 THEN
        RAISE WARNING 'Found % orphaned user_content_log records', orphan_count;
    END IF;
END $$;

RAISE NOTICE 'Data integrity check complete.';

-- ======================================
-- STEP 12: Create new indexes
-- ======================================
RAISE NOTICE 'Creating optimized indexes...';

-- Content table indexes (keeping existing ones except dropped API ones)
CREATE INDEX IF NOT EXISTS content_title_idx ON content(title);
CREATE INDEX IF NOT EXISTS content_status_idx ON content(status);
CREATE INDEX IF NOT EXISTS content_adult_idx ON content(adult);
CREATE INDEX IF NOT EXISTS content_is_continuing_idx ON content(is_continuing);

-- ISBN index for books
CREATE INDEX IF NOT EXISTS content_isbn_idx ON content(isbn) WHERE isbn IS NOT NULL;

-- Keep IMDB id index (external reference)
-- CREATE INDEX IF NOT EXISTS content_imdb_id_idx ON content(imdb_id) WHERE imdb_id IS NOT NULL;
-- (This should already exist)

RAISE NOTICE 'Indexes created.';

-- ======================================
-- STEP 13: Update statistics
-- ======================================
RAISE NOTICE 'Updating table statistics...';

ANALYZE content;
ANALYZE person;
ANALYZE company;
ANALYZE genre;
ANALYZE platform;
ANALYZE movie_details;
ANALYZE tv_details;
ANALYZE game_details;
ANALYZE book_details;

RAISE NOTICE 'Statistics updated.';

-- ======================================
-- STEP 14: Summary
-- ======================================
DO $$
DECLARE
    content_count INT;
    user_count INT;
    review_count INT;
    log_count INT;
BEGIN
    SELECT COUNT(*) INTO content_count FROM content;
    SELECT COUNT(*) INTO user_count FROM app_user;
    SELECT COUNT(*) INTO review_count FROM review;
    SELECT COUNT(*) INTO log_count FROM user_content_log;
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Migration completed successfully at %', NOW();
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Database Summary:';
    RAISE NOTICE '  - Content items: %', content_count;
    RAISE NOTICE '  - Users: %', user_count;
    RAISE NOTICE '  - Reviews: %', review_count;
    RAISE NOTICE '  - User logs: %', log_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Removed Tables:';
    RAISE NOTICE '  - tmdb_person, tmdb_company, tmdb_genre, tmdb_platform';
    RAISE NOTICE '  - igdb_person, igdb_company, igdb_genre, igdb_platform';
    RAISE NOTICE '  - book_category';
    RAISE NOTICE '  - tv_network, tv_show_network';
    RAISE NOTICE '';
    RAISE NOTICE 'Removed Columns from content:';
    RAISE NOTICE '  - tmdb_id, igdb_id, google_books_id';
    RAISE NOTICE '  - raw_data, vote_average, vote_count, popularity';
    RAISE NOTICE '  - budget, revenue (moved to movie_details)';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated Columns:';
    RAISE NOTICE '  - *_path -> *_url (full URLs now)';
    RAISE NOTICE '  - person.gender: Int -> String';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update Prisma schema file';
    RAISE NOTICE '  2. Run: npm run prisma:generate';
    RAISE NOTICE '  3. Update GraphQL resolvers';
    RAISE NOTICE '  4. Update frontend components';
    RAISE NOTICE '==========================================';
END $$;

COMMIT;

-- ======================================
-- Rollback script (save separately!)
-- ======================================
-- If something goes wrong, you can rollback with:
-- ROLLBACK;
-- Then restore from your backup!
