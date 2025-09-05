-- Drop all tables in a PostgreSQL schema (here is 'public' schema)
-- REF: https://supabase.com/docs/guides/database/postgres/dropping-all-tables-in-schema
do $$ declare
    r record;
begin
    for r in (select tablename from pg_tables where schemaname = 'public') loop
        execute 'drop table if exists ' || quote_ident(r.tablename) || ' cascade';
    end loop;
end $$;




-- BlackBox App Initial Schema for Supabase
-- Based on your existing PostgreSQL database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing enum types if they exist (to avoid conflicts)
DROP TYPE IF EXISTS content_type_enum CASCADE;
DROP TYPE IF EXISTS content_status_enum CASCADE;

-- Create enum tables (Supabase alternative to enum types)
CREATE TABLE public.content_type_lookup (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

CREATE TABLE public.content_status_lookup (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- Create main user table with Supabase auth integration
CREATE TABLE public.app_user (
    auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    picture_path TEXT,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    personality_analyze TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content table
CREATE TABLE public.content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_type_id INTEGER NOT NULL REFERENCES public.content_type_lookup(id),
    release_date DATE,
    description TEXT,
    length INTEGER, -- in minutes for movies, hours for games
    poster_path TEXT,
    consume_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    list_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    rating_distribution INTEGER[] DEFAULT ARRAY[0,0,0,0,0], -- [1-star, 2-star, 3-star, 4-star, 5-star]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Genre tables for movies and games
CREATE TABLE public.m_genre (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE public.g_genre (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Director/Creator tables
CREATE TABLE public.m_director (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    profile_path TEXT
);

CREATE TABLE public.g_director (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    profile_path TEXT
);

-- Cast/Actor tables
CREATE TABLE public.m_cast (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    profile_path TEXT
);

-- Platform tables
CREATE TABLE public.m_platform (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    logo_path TEXT
);

CREATE TABLE public.g_platform (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    logo_path TEXT
);

-- Country and Language tables
CREATE TABLE public.m_country (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE public.m_language (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE public.g_country (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE public.g_language (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Theme tables
CREATE TABLE public.m_theme (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE public.g_theme (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- Cross-reference tables for movies
CREATE TABLE public.x_movie_genre (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES public.m_genre(id) ON DELETE CASCADE,
    UNIQUE(movie_id, genre_id)
);

CREATE TABLE public.x_movie_director (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    director_id INTEGER NOT NULL REFERENCES public.m_director(id) ON DELETE CASCADE,
    UNIQUE(movie_id, director_id)
);

CREATE TABLE public.x_movie_cast (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    cast_id INTEGER NOT NULL REFERENCES public.m_cast(id) ON DELETE CASCADE,
    character_name VARCHAR(255),
    UNIQUE(movie_id, cast_id)
);

CREATE TABLE public.x_movie_platform (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    platform_id INTEGER NOT NULL REFERENCES public.m_platform(id) ON DELETE CASCADE,
    UNIQUE(movie_id, platform_id)
);

CREATE TABLE public.x_movie_country (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    country_id INTEGER NOT NULL REFERENCES public.m_country(id) ON DELETE CASCADE,
    UNIQUE(movie_id, country_id)
);

CREATE TABLE public.x_movie_language (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    language_id INTEGER NOT NULL REFERENCES public.m_language(id) ON DELETE CASCADE,
    UNIQUE(movie_id, language_id)
);

CREATE TABLE public.x_movie_theme (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    theme_id INTEGER NOT NULL REFERENCES public.m_theme(id) ON DELETE CASCADE,
    UNIQUE(movie_id, theme_id)
);

-- Cross-reference tables for games
CREATE TABLE public.x_game_genre (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES public.g_genre(id) ON DELETE CASCADE,
    UNIQUE(game_id, genre_id)
);

CREATE TABLE public.x_game_director (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    director_id INTEGER NOT NULL REFERENCES public.g_director(id) ON DELETE CASCADE,
    UNIQUE(game_id, director_id)
);

CREATE TABLE public.x_game_platform (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    platform_id INTEGER NOT NULL REFERENCES public.g_platform(id) ON DELETE CASCADE,
    UNIQUE(game_id, platform_id)
);

CREATE TABLE public.x_game_country (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    country_id INTEGER NOT NULL REFERENCES public.g_country(id) ON DELETE CASCADE,
    UNIQUE(game_id, country_id)
);

CREATE TABLE public.x_game_language (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    language_id INTEGER NOT NULL REFERENCES public.g_language(id) ON DELETE CASCADE,
    UNIQUE(game_id, language_id)
);

CREATE TABLE public.x_game_theme (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    theme_id INTEGER NOT NULL REFERENCES public.g_theme(id) ON DELETE CASCADE,
    UNIQUE(game_id, theme_id)
);

-- Review table
CREATE TABLE public.review (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User content log (tracks user interactions with content)
CREATE TABLE public.user_content_log (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    content_status_id INTEGER REFERENCES public.content_status_lookup(id),
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    is_favorite BOOLEAN DEFAULT FALSE,
    is_consume_later BOOLEAN DEFAULT FALSE,
    review_id INTEGER REFERENCES public.review(id) ON DELETE SET NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- No UNIQUE constraint - allows multiple logs per user-content pair
);

-- Review interactions
CREATE TABLE public.review_comment (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES public.review(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.review_like (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES public.review(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- User follow system
CREATE TABLE public.user_follow (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    following_user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, following_user_id),
    CHECK (user_id != following_user_id)
);

-- Movie lists (for user-created lists)
CREATE TABLE public.list_movie (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    list_name VARCHAR(255) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, movie_id, list_name)
);

-- Insert initial enum data
INSERT INTO public.content_type_lookup (id, name) VALUES 
    (1, 'MOVIE'),
    (2, 'GAME'),
    (3, 'BOOK');

INSERT INTO public.content_status_lookup (id, name) VALUES 
    (1, 'CONSUMED'),
    (2, 'CONSUMING'),
    (3, 'UNFINISHED'),
    (4, 'ABANDONED');

-- Create indexes for better performance
CREATE INDEX idx_content_type ON public.content(content_type_id);
CREATE INDEX idx_content_release_date ON public.content(release_date);
CREATE INDEX idx_user_content_log_user ON public.user_content_log(user_id);
CREATE INDEX idx_user_content_log_content ON public.user_content_log(content_id);
CREATE INDEX idx_user_content_log_date ON public.user_content_log(date);
-- Indexes for multiple logs support (without uniqueness)
CREATE INDEX idx_user_content_log_user_content ON public.user_content_log(user_id, content_id);
CREATE INDEX idx_user_content_log_date_desc ON public.user_content_log(user_id, content_id, date DESC);
CREATE INDEX idx_review_content ON public.review(content_id);
CREATE INDEX idx_review_user ON public.review(user_id);
CREATE INDEX idx_user_follow_user ON public.user_follow(user_id);
CREATE INDEX idx_user_follow_following ON public.user_follow(following_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_like ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_movie ENABLE ROW LEVEL SECURITY;

-- Review sistemi tabloları için RLS'yi devre dışı bırak (geliştirme için)
ALTER TABLE public.review_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reply_likes DISABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON public.app_user
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.app_user
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON public.app_user
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- User content logs
CREATE POLICY "Users can view own content logs" ON public.user_content_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content logs" ON public.user_content_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content logs" ON public.user_content_log
    FOR UPDATE USING (auth.uid() = user_id);

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.review
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own reviews" ON public.review
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.review
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.review
    FOR DELETE USING (auth.uid() = user_id);

-- Review comments
CREATE POLICY "Anyone can view review comments" ON public.review_comment
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own review comments" ON public.review_comment
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Review likes
CREATE POLICY "Anyone can view review likes" ON public.review_like
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own review likes" ON public.review_like
    FOR ALL USING (auth.uid() = user_id);

-- User follows
CREATE POLICY "Anyone can view follows" ON public.user_follow
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" ON public.user_follow
    FOR ALL USING (auth.uid() = user_id);

-- Movie lists
CREATE POLICY "Users can view own lists" ON public.list_movie
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own lists" ON public.list_movie
    FOR ALL USING (auth.uid() = user_id);

-- Create function to handle user creation after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.app_user (auth_user_id, email, username)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_app_user_updated_at BEFORE UPDATE ON public.app_user
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON public.content
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_updated_at BEFORE UPDATE ON public.review
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_content_log_updated_at BEFORE UPDATE ON public.user_content_log
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view to get the latest user content log for each user-content pair
-- This view helps get only the most recent interaction when needed
CREATE OR REPLACE VIEW latest_user_content_log AS
SELECT DISTINCT ON (user_id, content_id)
    id,
    user_id,
    content_id,
    content_status_id,
    rating,
    is_favorite,
    is_consume_later,
    review_id,
    date,
    updated_at
FROM user_content_log
ORDER BY user_id, content_id, date DESC;


-- Hızlı çözüm: RLS'yi tamamen kapat - TÜM TABLOLAR

-- Ana tablolar
ALTER TABLE app_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE content DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE review DISABLE ROW LEVEL SECURITY;
ALTER TABLE review_comment DISABLE ROW LEVEL SECURITY;
ALTER TABLE review_like DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_follow DISABLE ROW LEVEL SECURITY;
ALTER TABLE list_movie DISABLE ROW LEVEL SECURITY;

-- Lookup tablolar
ALTER TABLE content_type_lookup DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_status_lookup DISABLE ROW LEVEL SECURITY;

-- Film ile ilgili tablolar
ALTER TABLE m_genre DISABLE ROW LEVEL SECURITY;
ALTER TABLE m_director DISABLE ROW LEVEL SECURITY;
ALTER TABLE m_cast DISABLE ROW LEVEL SECURITY;
ALTER TABLE m_platform DISABLE ROW LEVEL SECURITY;
ALTER TABLE m_country DISABLE ROW LEVEL SECURITY;
ALTER TABLE m_language DISABLE ROW LEVEL SECURITY;
ALTER TABLE m_theme DISABLE ROW LEVEL SECURITY;

-- Oyun ile ilgili tablolar
ALTER TABLE g_genre DISABLE ROW LEVEL SECURITY;
ALTER TABLE g_director DISABLE ROW LEVEL SECURITY;
ALTER TABLE g_platform DISABLE ROW LEVEL SECURITY;
ALTER TABLE g_country DISABLE ROW LEVEL SECURITY;
ALTER TABLE g_language DISABLE ROW LEVEL SECURITY;
ALTER TABLE g_theme DISABLE ROW LEVEL SECURITY;

-- Film cross-reference tablolar
ALTER TABLE x_movie_genre DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_movie_director DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_movie_cast DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_movie_platform DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_movie_country DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_movie_language DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_movie_theme DISABLE ROW LEVEL SECURITY;

-- Oyun cross-reference tablolar
ALTER TABLE x_game_genre DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_game_director DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_game_platform DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_game_country DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_game_language DISABLE ROW LEVEL SECURITY;
ALTER TABLE x_game_theme DISABLE ROW LEVEL SECURITY;

-- ===========================================
-- MIGRATION 003: Fix get_user_contents function
-- ===========================================

-- Fix get_user_contents function: remove invalid top-level ORDER BY with aggregate
-- and add SECURITY DEFINER so it can read target user's logs (adjust if undesired).

CREATE OR REPLACE FUNCTION public.get_user_contents(
    user_id_param UUID,
    log_user_id_param UUID,
    content_type_param INTEGER,
    page_param INTEGER,
    limit_param INTEGER DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offset_param INTEGER;
    total_count INTEGER;
    total_pages INTEGER;
    contents JSON;
BEGIN
    offset_param := (page_param - 1) * limit_param;

    -- Total count of logs for the target user & content type
    SELECT COUNT(*) INTO total_count
    FROM user_content_log ucl_log
    JOIN content c ON c.id = ucl_log.content_id
    WHERE ucl_log.user_id = log_user_id_param
      AND c.content_type_id = content_type_param;

    total_pages := CEIL(GREATEST(total_count,0)::DECIMAL / NULLIF(limit_param,0));

    -- Build rows first (ordered + paginated), then aggregate to avoid ORDER BY + aggregate error
    WITH rows AS (
        SELECT 
            ucl_log.id AS log_id,
            ucl_log.user_id AS log_user_id,
            ucl_log.content_id,
            ucl_log.content_status_id AS log_content_status_id,
            ucl_log.is_favorite AS log_is_favorite,
            ucl_log.is_consume_later AS log_is_consume_later,
            ucl_log.rating AS log_rating,
            ucl_log.date AS log_date,
            r.text AS review_text,
            c.id AS c_id,
            c.poster_path,
            c.content_type_id,
            au.picture_path,
            ucl_user.content_status_id AS viewer_content_status_id,
            ucl_user.is_favorite AS viewer_is_favorite,
            ucl_user.is_consume_later AS viewer_is_consume_later,
            ucl_user.rating AS viewer_rating
        FROM user_content_log ucl_log
        JOIN content c ON c.id = ucl_log.content_id
        JOIN app_user au ON au.auth_user_id = ucl_log.user_id
        LEFT JOIN review r ON r.id = ucl_log.review_id
        LEFT JOIN user_content_log ucl_user ON ucl_user.content_id = ucl_log.content_id AND ucl_user.user_id = user_id_param
        WHERE ucl_log.user_id = log_user_id_param
          AND c.content_type_id = content_type_param
        ORDER BY ucl_log.date DESC
        LIMIT limit_param OFFSET offset_param
    )
    SELECT json_agg(
        json_build_object(
            'user_id', user_id_param,
            'content_id', c_id,
            'poster_path', poster_path,
            'content_type_id', content_type_id,
            'content_status_id', COALESCE(viewer_content_status_id, log_content_status_id),
            'is_favorite', COALESCE(viewer_is_favorite, false),
            'is_consume_later', COALESCE(viewer_is_consume_later, false),
            'rating', viewer_rating,
            'userLog', json_build_object(
                'id', log_id,
                'picture_path', picture_path,
                'content_id', content_id,
                'content_type_id', content_type_id,
                'user_id', log_user_id,
                'date', log_date,
                'content_status_id', log_content_status_id,
                'is_favorite', log_is_favorite,
                'is_consume_later', log_is_consume_later,
                'rating', log_rating,
                'review_text', review_text
            )
        )
    ) INTO contents
    FROM rows;

    RETURN json_build_object(
        'contents', COALESCE(contents, '[]'::json),
        'total_pages', COALESCE(total_pages,1),
        'current_page', page_param,
        'total_count', total_count
    );
END;
$$;

-- Optional: grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_contents(UUID,UUID,INTEGER,INTEGER,INTEGER) TO authenticated;

-- ===========================================
-- MIGRATION 004: Review likes table
-- ===========================================

-- Create review_likes table for handling likes on reviews
CREATE TABLE IF NOT EXISTS review_likes (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES review(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(auth_user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only like a review once
    UNIQUE(review_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_created_at ON review_likes(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all likes
CREATE POLICY "Users can view all review likes" ON review_likes
    FOR SELECT USING (true);

-- Policy: Users can insert their own likes
CREATE POLICY "Users can insert their own review likes" ON review_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own likes
CREATE POLICY "Users can delete their own review likes" ON review_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON review_likes TO authenticated;
GRANT USAGE ON SEQUENCE review_likes_id_seq TO authenticated;

-- ===========================================
-- MIGRATION 005: Review replies table
-- ===========================================

-- Create review_replies table for nested comments on reviews
CREATE TABLE IF NOT EXISTS review_replies (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES review(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(auth_user_id) ON DELETE CASCADE,
    parent_reply_id INTEGER REFERENCES review_replies(id) ON DELETE CASCADE, -- For nested replies
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_parent_id ON review_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all replies
CREATE POLICY "Users can view all review replies" ON review_replies
    FOR SELECT USING (true);

-- Policy: Users can insert their own replies
CREATE POLICY "Users can insert their own review replies" ON review_replies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own replies
CREATE POLICY "Users can update their own review replies" ON review_replies
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own replies
CREATE POLICY "Users can delete their own review replies" ON review_replies
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON review_replies TO authenticated;
GRANT USAGE ON SEQUENCE review_replies_id_seq TO authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_review_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_review_replies_updated_at
    BEFORE UPDATE ON review_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_review_replies_updated_at();

-- ===========================================
-- MIGRATION 006: Review reply likes table
-- ===========================================

-- Create review_reply_likes table for tracking reply likes
CREATE TABLE review_reply_likes (
    id BIGSERIAL PRIMARY KEY,
    reply_id BIGINT NOT NULL REFERENCES review_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(auth_user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Ensure a user can only like a reply once
    UNIQUE(reply_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_review_reply_likes_reply_id ON review_reply_likes(reply_id);
CREATE INDEX idx_review_reply_likes_user_id ON review_reply_likes(user_id);
CREATE INDEX idx_review_reply_likes_created_at ON review_reply_likes(created_at);

-- Disable RLS for development
ALTER TABLE review_reply_likes DISABLE ROW LEVEL SECURITY;

-- Add some comments for documentation
COMMENT ON TABLE review_reply_likes IS 'Tracks which users have liked which review replies';
COMMENT ON COLUMN review_reply_likes.reply_id IS 'Reference to the review reply being liked';
COMMENT ON COLUMN review_reply_likes.user_id IS 'Reference to the user who liked the reply';

-- ===========================================
-- MIGRATION 007: Update content stats
-- ===========================================

-- Recompute and maintain aggregated content stats (favorites, consumes, reviews, rating distribution)
CREATE OR REPLACE FUNCTION public.recompute_content_stats(
    content_id_param INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fav_count INTEGER := 0;
    v_consume_count INTEGER := 0;
    v_review_count INTEGER := 0;
    v_rating_dist INTEGER[] := ARRAY[0,0,0,0,0];
    v_content_type_id INTEGER;
BEGIN
    -- Determine content type
    SELECT content_type_id INTO v_content_type_id FROM public.content WHERE id = content_id_param;

    -- Favorite count (based on latest logs per user)
    SELECT COUNT(*) INTO v_fav_count
    FROM public.latest_user_content_log ucl
    WHERE ucl.content_id = content_id_param AND COALESCE(ucl.is_favorite, false) = true;

    -- Consume (watched) count (latest logs)
    SELECT COUNT(*) INTO v_consume_count
    FROM public.latest_user_content_log ucl
    WHERE ucl.content_id = content_id_param AND ucl.content_status_id = 1; -- 1 = CONSUMED

    -- Review count
    SELECT COUNT(*) INTO v_review_count
    FROM public.review r
    WHERE r.content_id = content_id_param;

    -- Rating distribution (round to nearest star 1..5 based on latest logs)
    WITH ratings AS (
        SELECT ROUND(ucl.rating)::INT AS star
        FROM public.latest_user_content_log ucl
        WHERE ucl.content_id = content_id_param AND ucl.rating IS NOT NULL
    )
    SELECT ARRAY[
        COALESCE(SUM(CASE WHEN star = 1 THEN 1 ELSE 0 END),0),
        COALESCE(SUM(CASE WHEN star = 2 THEN 1 ELSE 0 END),0),
        COALESCE(SUM(CASE WHEN star = 3 THEN 1 ELSE 0 END),0),
        COALESCE(SUM(CASE WHEN star = 4 THEN 1 ELSE 0 END),0),
        COALESCE(SUM(CASE WHEN star = 5 THEN 1 ELSE 0 END),0)
    ] INTO v_rating_dist FROM ratings;

    -- Update content table
    UPDATE public.content
    SET favorite_count = COALESCE(v_fav_count, 0),
        consume_count = COALESCE(v_consume_count, 0),
        review_count = COALESCE(v_review_count, 0),
        rating_distribution = COALESCE(v_rating_dist, ARRAY[0,0,0,0,0])
    WHERE id = content_id_param;
END;
$$;

-- Triggers to keep aggregates fresh
CREATE OR REPLACE FUNCTION public.trg_after_user_content_log_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.recompute_content_stats(NEW.content_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_ucl_insert ON public.user_content_log;
CREATE TRIGGER after_ucl_insert
AFTER INSERT ON public.user_content_log
FOR EACH ROW EXECUTE FUNCTION public.trg_after_user_content_log_update();

DROP TRIGGER IF EXISTS after_ucl_update ON public.user_content_log;
CREATE TRIGGER after_ucl_update
AFTER UPDATE ON public.user_content_log
FOR EACH ROW EXECUTE FUNCTION public.trg_after_user_content_log_update();

-- Also recompute on review insert/delete to keep review_count accurate
CREATE OR REPLACE FUNCTION public.trg_after_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.recompute_content_stats(COALESCE(NEW.content_id, OLD.content_id));
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_review_insert ON public.review;
CREATE TRIGGER after_review_insert
AFTER INSERT ON public.review
FOR EACH ROW EXECUTE FUNCTION public.trg_after_review_change();

DROP TRIGGER IF EXISTS after_review_delete ON public.review;
CREATE TRIGGER after_review_delete
AFTER DELETE ON public.review
FOR EACH ROW EXECUTE FUNCTION public.trg_after_review_change();