-- Create review_likes table
CREATE TABLE IF NOT EXISTS review_likes (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES review(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- Create review_replies table
CREATE TABLE IF NOT EXISTS review_replies (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES review(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    parent_reply_id INTEGER REFERENCES review_replies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create review_reply_likes table
CREATE TABLE IF NOT EXISTS review_reply_likes (
    id SERIAL PRIMARY KEY,
    reply_id INTEGER NOT NULL REFERENCES review_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reply_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_parent_id ON review_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_review_reply_likes_reply_id ON review_reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_review_reply_likes_user_id ON review_reply_likes(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reply_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (ignore errors)
DROP POLICY IF EXISTS "Users can view all review likes" ON review_likes;
DROP POLICY IF EXISTS "Users can insert their own review likes" ON review_likes;
DROP POLICY IF EXISTS "Users can delete their own review likes" ON review_likes;

DROP POLICY IF EXISTS "Users can view all review replies" ON review_replies;
DROP POLICY IF EXISTS "Users can insert their own review replies" ON review_replies;
DROP POLICY IF EXISTS "Users can update their own review replies" ON review_replies;
DROP POLICY IF EXISTS "Users can delete their own review replies" ON review_replies;

DROP POLICY IF EXISTS "Users can view all review reply likes" ON review_reply_likes;
DROP POLICY IF EXISTS "Users can insert their own review reply likes" ON review_reply_likes;
DROP POLICY IF EXISTS "Users can delete their own review reply likes" ON review_reply_likes;

-- Create RLS policies for review_likes
CREATE POLICY "Users can view all review likes" ON review_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own review likes" ON review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own review likes" ON review_likes FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for review_replies
CREATE POLICY "Users can view all review replies" ON review_replies FOR SELECT USING (true);
CREATE POLICY "Users can insert their own review replies" ON review_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own review replies" ON review_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own review replies" ON review_replies FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for review_reply_likes
CREATE POLICY "Users can view all review reply likes" ON review_reply_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own review reply likes" ON review_reply_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own review reply likes" ON review_reply_likes FOR DELETE USING (auth.uid() = user_id);

-- Drop existing trigger if it exists (but keep the function since other tables use it)
DROP TRIGGER IF EXISTS update_review_replies_updated_at ON review_replies;

-- Create trigger to update updated_at timestamp for review_replies
-- (The update_updated_at_column function already exists and is used by other tables)
CREATE TRIGGER update_review_replies_updated_at BEFORE UPDATE ON review_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
