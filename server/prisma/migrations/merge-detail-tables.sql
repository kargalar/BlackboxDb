-- ======================================
-- Migration: Merge BookDetail, MovieDetail, GameDetail, TvDetail into ContentDetail
-- ======================================

-- Step 1: Create the new content_detail table
CREATE TABLE content_detail (
  content_id VARCHAR(255) PRIMARY KEY NOT NULL,
  
  -- Movie/TV common
  collection_name VARCHAR(255),
  budget BIGINT,
  revenue BIGINT,
  
  -- TV-specific
  episode_run_time INTEGER[],
  number_of_episodes INTEGER,
  number_of_seasons INTEGER,
  type VARCHAR(50), -- series, miniseries, documentary
  in_production BOOLEAN,
  first_air_date DATE,
  last_air_date DATE,
  
  -- Book-specific
  subtitle VARCHAR(500),
  authors VARCHAR(255)[],
  publisher VARCHAR(255),
  published_date VARCHAR(50),
  categories VARCHAR(255)[],
  maturity_rating VARCHAR(50),
  language VARCHAR(10),
  book_series VARCHAR(255),
  book_series_number INTEGER,
  preview_link TEXT,
  info_link TEXT,
  canonical_volume_link TEXT,
  
  -- Game-specific
  category INTEGER,
  storyline TEXT,
  summary TEXT,
  version_title VARCHAR(255),
  version_parent INTEGER,
  collection INTEGER,
  game_modes VARCHAR(255)[],
  perspectives VARCHAR(255)[],
  themes VARCHAR(255)[],
  game_franchise VARCHAR(255),
  game_series VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Step 2: Migrate data from old tables to new table
-- Migrate from movie_details
INSERT INTO content_detail (content_id, collection_name, budget, revenue, created_at, updated_at)
SELECT content_id, collection_name, budget, revenue, created_at, updated_at FROM movie_details
ON CONFLICT DO NOTHING;

-- Migrate from tv_details
INSERT INTO content_detail (
  content_id, episode_run_time, number_of_episodes, number_of_seasons, type,
  in_production, first_air_date, last_air_date, created_at, updated_at
)
SELECT 
  content_id, episode_run_time, number_of_episodes, number_of_seasons, type,
  in_production, first_air_date, last_air_date, created_at, updated_at
FROM tv_details
ON CONFLICT (content_id) DO UPDATE SET
  episode_run_time = EXCLUDED.episode_run_time,
  number_of_episodes = EXCLUDED.number_of_episodes,
  number_of_seasons = EXCLUDED.number_of_seasons,
  type = EXCLUDED.type,
  in_production = EXCLUDED.in_production,
  first_air_date = EXCLUDED.first_air_date,
  last_air_date = EXCLUDED.last_air_date;

-- Migrate from book_details
INSERT INTO content_detail (
  content_id, subtitle, authors, publisher, published_date, categories,
  maturity_rating, language, book_series, book_series_number,
  preview_link, info_link, canonical_volume_link, created_at, updated_at
)
SELECT
  content_id, subtitle, authors, publisher, published_date, categories,
  maturity_rating, language, series, series_number,
  preview_link, info_link, canonical_volume_link, created_at, updated_at
FROM book_details
ON CONFLICT (content_id) DO UPDATE SET
  subtitle = EXCLUDED.subtitle,
  authors = EXCLUDED.authors,
  publisher = EXCLUDED.publisher,
  published_date = EXCLUDED.published_date,
  categories = EXCLUDED.categories,
  maturity_rating = EXCLUDED.maturity_rating,
  language = EXCLUDED.language,
  book_series = EXCLUDED.book_series,
  book_series_number = EXCLUDED.book_series_number,
  preview_link = EXCLUDED.preview_link,
  info_link = EXCLUDED.info_link,
  canonical_volume_link = EXCLUDED.canonical_volume_link;

-- Migrate from game_details
INSERT INTO content_detail (
  content_id, category, storyline, summary, version_title, version_parent,
  collection, game_modes, perspectives, themes, game_franchise, game_series, created_at, updated_at
)
SELECT
  content_id, category, storyline, summary, version_title, version_parent,
  collection, game_modes, perspectives, themes, franchise, series, created_at, updated_at
FROM game_details
ON CONFLICT (content_id) DO UPDATE SET
  category = EXCLUDED.category,
  storyline = EXCLUDED.storyline,
  summary = EXCLUDED.summary,
  version_title = EXCLUDED.version_title,
  version_parent = EXCLUDED.version_parent,
  collection = EXCLUDED.collection,
  game_modes = EXCLUDED.game_modes,
  perspectives = EXCLUDED.perspectives,
  themes = EXCLUDED.themes,
  game_franchise = EXCLUDED.game_franchise,
  game_series = EXCLUDED.game_series;

-- Step 3: Update tv_episode table to reference content_detail
ALTER TABLE tv_episode
DROP CONSTRAINT tv_episode_tv_show_id_fkey,
ADD CONSTRAINT tv_episode_tv_show_id_fkey 
  FOREIGN KEY (tv_show_id) REFERENCES content_detail(content_id) ON DELETE CASCADE;

-- Step 4: Update tv_season table to reference content_detail
ALTER TABLE tv_season
DROP CONSTRAINT tv_season_tv_show_id_fkey,
ADD CONSTRAINT tv_season_tv_show_id_fkey 
  FOREIGN KEY (tv_show_id) REFERENCES content_detail(content_id) ON DELETE CASCADE;

-- Step 5: Drop old tables
DROP TABLE IF EXISTS movie_details CASCADE;
DROP TABLE IF EXISTS book_details CASCADE;
DROP TABLE IF EXISTS game_details CASCADE;
DROP TABLE IF EXISTS tv_details CASCADE;

-- Step 6: Create index on content_detail
CREATE INDEX idx_content_detail_content_id ON content_detail(content_id);
