-- Migration: Add voting system to reviews
-- Description: Add upvote/downvote columns to Review model and create ReviewVote table

-- Step 1: Add voting columns to review table
ALTER TABLE review
ADD COLUMN upvote_count INT NOT NULL DEFAULT 0,
ADD COLUMN downvote_count INT NOT NULL DEFAULT 0;

-- Step 2: Create review_vote table for tracking individual votes
CREATE TABLE IF NOT EXISTS review_vote (
  id SERIAL PRIMARY KEY,
  review_id INT NOT NULL,
  user_id UUID NOT NULL,
  vote_type INT NOT NULL, -- 1 = upvote, -1 = downvote
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_review_vote_review FOREIGN KEY (review_id) REFERENCES review(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_vote_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
  CONSTRAINT unique_review_vote UNIQUE (review_id, user_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_review_vote_review_id ON review_vote(review_id);
CREATE INDEX idx_review_vote_user_id ON review_vote(user_id);

-- Step 4: Add voting columns to review_comment table
ALTER TABLE review_comment
ADD COLUMN upvote_count INT NOT NULL DEFAULT 0,
ADD COLUMN downvote_count INT NOT NULL DEFAULT 0;

-- Step 5: Create review_comment_vote table
CREATE TABLE IF NOT EXISTS review_comment_vote (
  id SERIAL PRIMARY KEY,
  comment_id INT NOT NULL,
  user_id UUID NOT NULL,
  vote_type INT NOT NULL, -- 1 = upvote, -1 = downvote
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_review_comment_vote_comment FOREIGN KEY (comment_id) REFERENCES review_comment(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_comment_vote_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
  CONSTRAINT unique_review_comment_vote UNIQUE (comment_id, user_id)
);

-- Step 6: Create indexes for review comment votes
CREATE INDEX idx_review_comment_vote_comment_id ON review_comment_vote(comment_id);
CREATE INDEX idx_review_comment_vote_user_id ON review_comment_vote(user_id);

-- Step 7: Migrate existing likes to upvotes
-- Convert review_like records to review_vote records as upvotes
INSERT INTO review_vote (review_id, user_id, vote_type, created_at)
SELECT review_id, user_id, 1, created_at
FROM review_like
ON CONFLICT (review_id, user_id) DO NOTHING;

-- Step 8: Update upvote counts based on migrated data
UPDATE review r
SET upvote_count = (
  SELECT COUNT(*)
  FROM review_vote rv
  WHERE rv.review_id = r.id AND rv.vote_type = 1
);

-- Step 9: Convert review_comment_like records to review_comment_vote records
INSERT INTO review_comment_vote (comment_id, user_id, vote_type, created_at)
SELECT review_comment_id, user_id, 1, created_at
FROM review_comment_like
ON CONFLICT (comment_id, user_id) DO NOTHING;

-- Step 10: Update comment upvote counts
UPDATE review_comment rc
SET upvote_count = (
  SELECT COUNT(*)
  FROM review_comment_vote rcv
  WHERE rcv.comment_id = rc.id AND rcv.vote_type = 1
);

-- Note: We'll keep the old like tables and columns for now for backward compatibility
-- They can be dropped in a future migration after confirming everything works correctly
