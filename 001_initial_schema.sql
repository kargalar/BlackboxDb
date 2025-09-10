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
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        is_moderator BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN public.app_user.is_admin IS 'User has full administrative privileges.';
COMMENT ON COLUMN public.app_user.is_moderator IS 'User has moderation privileges (limited admin).';

-- Guard helper functions for roles
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE((SELECT is_admin FROM public.app_user au WHERE au.auth_user_id = p_user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.is_moderator(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE((SELECT is_moderator FROM public.app_user au WHERE au.auth_user_id = p_user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.is_privileged(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT public.is_admin(p_user_id) OR public.is_moderator(p_user_id);
$$;
GRANT EXECUTE ON FUNCTION public.is_privileged(uuid) TO authenticated;

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
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
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

CREATE TABLE public.review_likes (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES public.review(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON public.review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON public.review_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_created_at ON public.review_likes(created_at);

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

INSERT INTO public.content_type_lookup (id, name) VALUES 
    (1, 'MOVIE'),
    (2, 'GAME'),
    (3, 'TV'),
    (4, 'BOOK')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

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
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_movie ENABLE ROW LEVEL SECURITY;

-- Review sistemi tabloları için RLS'yi devre dışı bırak (geliştirme için)
-- Keep RLS as configured by table-specific policies

-- Create RLS policies
-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON public.app_user
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON public.app_user
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile" ON public.app_user
    FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

-- Content policies
CREATE POLICY "Anyone can view content" ON public.content
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert content" ON public.content
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Privileged can update content" ON public.content
    FOR UPDATE USING (public.is_privileged(auth.uid()));

CREATE POLICY "Privileged can delete content" ON public.content
    FOR DELETE USING (public.is_privileged(auth.uid()));

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
CREATE POLICY "Anyone can view review likes" ON public.review_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own review likes" ON public.review_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review likes" ON public.review_likes
    FOR DELETE USING (auth.uid() = user_id);

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
-- RLS: keep enabled per-table with policies; do not disable globally

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
-- MIGRATION 005: Review replies table
-- ===========================================

-- Create review_replies table for nested comments on reviews
CREATE TABLE IF NOT EXISTS public.review_replies (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES public.review(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    parent_reply_id INTEGER REFERENCES public.review_replies(id) ON DELETE CASCADE, -- For nested replies
    text TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON public.review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON public.review_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_parent_id ON public.review_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON public.review_replies(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all replies
CREATE POLICY "Users can view all review replies" ON public.review_replies
    FOR SELECT USING (true);

-- Policy: Users can insert their own replies
CREATE POLICY "Users can insert their own review replies" ON public.review_replies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own replies
CREATE POLICY "Users can update their own review replies" ON public.review_replies
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own replies
CREATE POLICY "Users can delete their own review replies" ON public.review_replies
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.review_replies TO authenticated;
GRANT USAGE ON SEQUENCE public.review_replies_id_seq TO authenticated;

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
    BEFORE UPDATE ON public.review_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_review_replies_updated_at();

-- ===========================================
-- MIGRATION 006: Review reply likes table
-- ===========================================

-- Create review_reply_likes table for tracking reply likes
CREATE TABLE public.review_reply_likes (
    id BIGSERIAL PRIMARY KEY,
    reply_id BIGINT NOT NULL REFERENCES public.review_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Ensure a user can only like a reply once
    UNIQUE(reply_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_review_reply_likes_reply_id ON public.review_reply_likes(reply_id);
CREATE INDEX idx_review_reply_likes_user_id ON public.review_reply_likes(user_id);
CREATE INDEX idx_review_reply_likes_created_at ON public.review_reply_likes(created_at);

-- Disable RLS for development
ALTER TABLE public.review_reply_likes DISABLE ROW LEVEL SECURITY;

-- Add some comments for documentation
COMMENT ON TABLE public.review_reply_likes IS 'Tracks which users have liked which review replies';
COMMENT ON COLUMN public.review_reply_likes.reply_id IS 'Reference to the review reply being liked';
COMMENT ON COLUMN public.review_reply_likes.user_id IS 'Reference to the user who liked the reply';

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

-- Function to update review stats (like_count, reply_count)
CREATE OR REPLACE FUNCTION public.recompute_review_stats(review_id_param INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_like_count INTEGER := 0;
    v_reply_count INTEGER := 0;
BEGIN
    -- Like count
    SELECT COUNT(*) INTO v_like_count
    FROM public.review_likes rl
    WHERE rl.review_id = review_id_param;

    -- Reply count
    SELECT COUNT(*) INTO v_reply_count
    FROM public.review_replies rr
    WHERE rr.review_id = review_id_param;

    -- Update review table
    UPDATE public.review
    SET like_count = COALESCE(v_like_count, 0),
        reply_count = COALESCE(v_reply_count, 0)
    WHERE id = review_id_param;
END;
$$;

-- Function to update reply stats (like_count, reply_count)
CREATE OR REPLACE FUNCTION public.recompute_reply_stats(reply_id_param INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_like_count INTEGER := 0;
    v_reply_count INTEGER := 0;
BEGIN
    -- Like count
    SELECT COUNT(*) INTO v_like_count
    FROM public.review_reply_likes rrl
    WHERE rrl.reply_id = reply_id_param;

    -- Reply count (nested replies)
    SELECT COUNT(*) INTO v_reply_count
    FROM public.review_replies rr
    WHERE rr.parent_reply_id = reply_id_param;

    -- Update reply table
    UPDATE public.review_replies
    SET like_count = COALESCE(v_like_count, 0),
        reply_count = COALESCE(v_reply_count, 0)
    WHERE id = reply_id_param;
END;
$$;

-- Triggers for review stats
CREATE OR REPLACE FUNCTION public.trg_after_review_like_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.recompute_review_stats(COALESCE(NEW.review_id, OLD.review_id));
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_review_like_insert ON public.review_likes;
CREATE TRIGGER after_review_like_insert
AFTER INSERT ON public.review_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_after_review_like_change();

DROP TRIGGER IF EXISTS after_review_like_delete ON public.review_likes;
CREATE TRIGGER after_review_like_delete
AFTER DELETE ON public.review_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_after_review_like_change();

-- Triggers for reply stats
CREATE OR REPLACE FUNCTION public.trg_after_reply_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update parent review's reply count
    IF TG_OP = 'INSERT' THEN
        PERFORM public.recompute_review_stats(NEW.review_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.recompute_review_stats(OLD.review_id);
    END IF;
    
    -- Update reply stats if it's a nested reply
    IF TG_OP = 'INSERT' AND NEW.parent_reply_id IS NOT NULL THEN
        PERFORM public.recompute_reply_stats(NEW.parent_reply_id);
    ELSIF TG_OP = 'DELETE' AND OLD.parent_reply_id IS NOT NULL THEN
        PERFORM public.recompute_reply_stats(OLD.parent_reply_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_reply_insert ON public.review_replies;
CREATE TRIGGER after_reply_insert
AFTER INSERT ON public.review_replies
FOR EACH ROW EXECUTE FUNCTION public.trg_after_reply_change();

DROP TRIGGER IF EXISTS after_reply_delete ON public.review_replies;
CREATE TRIGGER after_reply_delete
AFTER DELETE ON public.review_replies
FOR EACH ROW EXECUTE FUNCTION public.trg_after_reply_change();

-- Triggers for reply like stats
CREATE OR REPLACE FUNCTION public.trg_after_reply_like_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.recompute_reply_stats(COALESCE(NEW.reply_id, OLD.reply_id));
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_reply_like_insert ON public.review_reply_likes;
CREATE TRIGGER after_reply_like_insert
AFTER INSERT ON public.review_reply_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_after_reply_like_change();

DROP TRIGGER IF EXISTS after_reply_like_delete ON public.review_reply_likes;
CREATE TRIGGER after_reply_like_delete
AFTER DELETE ON public.review_reply_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_after_reply_like_change();

-- Notifications lookup and table
CREATE TABLE IF NOT EXISTS public.notification_type_lookup (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Seed notification types
INSERT INTO public.notification_type_lookup (id, name)
VALUES
    (1, 'REVIEW_LIKED'),
    (2, 'FOLLOWED_YOU'),
    (3, 'CONTENT_APPROVED'),
    (4, 'CONTENT_REJECTED'),
    (5, 'COMMENT_REMOVED')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.notification (
    id BIGSERIAL PRIMARY KEY,
    recipient_user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    type_id INTEGER NOT NULL REFERENCES public.notification_type_lookup(id) ON DELETE RESTRICT,
    review_id INTEGER NULL REFERENCES public.review(id) ON DELETE CASCADE,
    reply_id INTEGER NULL REFERENCES public.review_replies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_recipient ON public.notification(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON public.notification(recipient_user_id, read_at);

ALTER TABLE public.notification DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_type_lookup DISABLE ROW LEVEL SECURITY;

-- Notification triggers
CREATE OR REPLACE FUNCTION public.trg_create_notification_on_review_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recipient UUID;
    v_actor UUID;
BEGIN
    v_actor := NEW.user_id;
    SELECT r.user_id INTO v_recipient FROM public.review r WHERE r.id = NEW.review_id;
    IF v_recipient IS NULL OR v_recipient = v_actor THEN
        RETURN NEW;
    END IF;
    INSERT INTO public.notification (
        recipient_user_id,
        actor_user_id,
        type_id,
        review_id,
        created_at
    ) VALUES (
        v_recipient,
        v_actor,
        1,
        NEW.review_id,
        now()
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_review_like_insert ON public.review_likes;
CREATE TRIGGER after_review_like_insert
AFTER INSERT ON public.review_likes
FOR EACH ROW EXECUTE FUNCTION public.trg_create_notification_on_review_like();

CREATE OR REPLACE FUNCTION public.trg_create_notification_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.user_id = NEW.following_user_id THEN
        RETURN NEW;
    END IF;
    INSERT INTO public.notification (
        recipient_user_id,
        actor_user_id,
        type_id,
        created_at
    ) VALUES (
        NEW.following_user_id,
        NEW.user_id,
        2,
        now()
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_user_follow_insert ON public.user_follow;
CREATE TRIGGER after_user_follow_insert
AFTER INSERT ON public.user_follow
FOR EACH ROW EXECUTE FUNCTION public.trg_create_notification_on_follow();

-- Content request workflow
CREATE TABLE IF NOT EXISTS public.content_request_status_lookup (
    id SERIAL PRIMARY KEY,
    name varchar(32) UNIQUE NOT NULL
);

INSERT INTO public.content_request_status_lookup (id, name) VALUES
    (1, 'PENDING'),
    (2, 'APPROVED'),
    (3, 'REJECTED')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS public.content_request (
    id SERIAL PRIMARY KEY,
    requester_user_id UUID NOT NULL REFERENCES public.app_user(auth_user_id) ON DELETE CASCADE,
    title text NOT NULL,
    content_type_id integer NOT NULL REFERENCES public.content_type_lookup(id) ON DELETE RESTRICT,
    release_date date NULL,
    year integer NULL,
    duration_minutes integer NULL,
    description text NULL,
    poster_path text NULL,
    external_ids jsonb NULL,
    details jsonb NULL,
    status_id integer NOT NULL DEFAULT 1 REFERENCES public.content_request_status_lookup(id) ON DELETE RESTRICT,
    admin_user_id UUID NULL REFERENCES public.app_user(auth_user_id) ON DELETE SET NULL,
    rejection_reason text NULL,
    decided_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_request_requester ON public.content_request(requester_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_request_status ON public.content_request(status_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_request_updated_at ON public.content_request;
CREATE TRIGGER trg_content_request_updated_at
BEFORE UPDATE ON public.content_request
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.content_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_request_status_lookup DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requester can view own content requests" ON public.content_request;
CREATE POLICY "Requester can view own content requests" ON public.content_request
    FOR SELECT USING (auth.uid() = requester_user_id OR public.is_privileged(auth.uid()));

DROP POLICY IF EXISTS "Requester can insert content requests" ON public.content_request;
CREATE POLICY "Requester can insert content requests" ON public.content_request
    FOR INSERT WITH CHECK (auth.uid() = requester_user_id);

DROP POLICY IF EXISTS "Requester can update own pending content requests" ON public.content_request;
CREATE POLICY "Requester can update own pending content requests" ON public.content_request
    FOR UPDATE USING (
        auth.uid() = requester_user_id AND status_id = 1
    ) WITH CHECK (
        auth.uid() = requester_user_id AND status_id = 1
    );

DROP POLICY IF EXISTS "Privileged can manage any content request" ON public.content_request;
CREATE POLICY "Privileged can manage any content request" ON public.content_request
    USING (public.is_privileged(auth.uid()))
    WITH CHECK (public.is_privileged(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_request TO authenticated;
GRANT SELECT ON public.content_request_status_lookup TO authenticated;

-- Privileged policies for content and reviews
ALTER TABLE IF EXISTS public.content ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'content' AND policyname = 'Anyone can view content'
    ) THEN
        CREATE POLICY "Anyone can view content" ON public.content
            FOR SELECT USING (true);
    END IF;
END $$;

DROP POLICY IF EXISTS "Privileged can manage content" ON public.content;
CREATE POLICY "Privileged can manage content" ON public.content
    FOR ALL USING (public.is_privileged(auth.uid()))
    WITH CHECK (public.is_privileged(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content TO authenticated;

DROP POLICY IF EXISTS "Privileged can delete any review" ON public.review;
CREATE POLICY "Privileged can delete any review" ON public.review
    FOR DELETE USING (public.is_privileged(auth.uid()));

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_user' AND policyname = 'Privileged can view all app users'
    ) THEN
        CREATE POLICY "Privileged can view all app users" ON public.app_user
            FOR SELECT USING (public.is_privileged(auth.uid()));
    END IF;
END $$;

DROP POLICY IF EXISTS "Privileged can update any app user" ON public.app_user;
CREATE POLICY "Privileged can update any app user" ON public.app_user
    FOR UPDATE USING (public.is_privileged(auth.uid()))
    WITH CHECK (public.is_privileged(auth.uid()));

DROP POLICY IF EXISTS "Privileged can delete any app user" ON public.app_user;
CREATE POLICY "Privileged can delete any app user" ON public.app_user
    FOR DELETE USING (public.is_privileged(auth.uid()));

-- Approval and rejection RPCs
CREATE OR REPLACE FUNCTION public.approve_content_request(p_request_id integer, p_admin_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req record;
    v_content_id integer;
    v_release_date date;
BEGIN
    SELECT * INTO v_req FROM public.content_request WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'content_request % not found', p_request_id USING ERRCODE = 'NO_DATA_FOUND';
    END IF;
    IF v_req.status_id <> 1 THEN
        RAISE EXCEPTION 'content_request % is not pending', p_request_id;
    END IF;
    v_release_date := COALESCE(v_req.release_date, CASE WHEN v_req.year IS NOT NULL THEN make_date(v_req.year, 1, 1) END);
    INSERT INTO public.content (title, content_type_id, release_date, description, poster_path, length)
    VALUES (v_req.title, v_req.content_type_id, v_release_date, v_req.description, v_req.poster_path, v_req.duration_minutes)
    RETURNING id INTO v_content_id;
    UPDATE public.content_request
        SET status_id = 2,
                admin_user_id = p_admin_id,
                decided_at = now(),
                rejection_reason = NULL
    WHERE id = p_request_id;
    INSERT INTO public.notification (recipient_user_id, actor_user_id, type_id, created_at)
    VALUES (v_req.requester_user_id, p_admin_id, 3, now());
    RETURN v_content_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_content_request(p_request_id integer, p_admin_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req record;
BEGIN
    SELECT * INTO v_req FROM public.content_request WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'content_request % not found', p_request_id USING ERRCODE = 'NO_DATA_FOUND';
    END IF;
    IF v_req.status_id <> 1 THEN
        RAISE EXCEPTION 'content_request % is not pending', p_request_id;
    END IF;
    UPDATE public.content_request
        SET status_id = 3,
                admin_user_id = p_admin_id,
                decided_at = now(),
                rejection_reason = p_reason
    WHERE id = p_request_id;
    INSERT INTO public.notification (recipient_user_id, actor_user_id, type_id, created_at)
    VALUES (v_req.requester_user_id, p_admin_id, 4, now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_content_request(integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_content_request(integer, uuid, text) TO authenticated;

-- Function to save book content (bypasses RLS)
CREATE OR REPLACE FUNCTION public.save_book_content(
    p_id INTEGER,
    p_title VARCHAR(255),
    p_content_type_id INTEGER,
    p_release_date DATE,
    p_description TEXT,
    p_length INTEGER,
    p_poster_path TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_data JSON;
BEGIN
    INSERT INTO public.content (id, title, content_type_id, release_date, description, length, poster_path)
    VALUES (p_id, p_title, p_content_type_id, p_release_date, p_description, p_length, p_poster_path)
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content_type_id = EXCLUDED.content_type_id,
        release_date = EXCLUDED.release_date,
        description = EXCLUDED.description,
        length = EXCLUDED.length,
        poster_path = EXCLUDED.poster_path
    RETURNING id, title, poster_path, favorite_count INTO v_data;
    
    RETURN v_data;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_book_content(INTEGER, VARCHAR, INTEGER, DATE, TEXT, INTEGER, TEXT) TO authenticated;