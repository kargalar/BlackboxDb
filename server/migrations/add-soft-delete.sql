-- Soft Delete Migration
-- Adds is_deleted and deleted_at columns to critical tables
-- This prevents permanent data loss on delete operations

-- Content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE content ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_content_is_deleted ON content(is_deleted);

-- AppUser table
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_app_user_is_deleted ON app_user(is_deleted);

-- Discussion table
ALTER TABLE discussion ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE discussion ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_discussion_is_deleted ON discussion(is_deleted);

-- DiscussionComment table
ALTER TABLE discussion_comment ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE discussion_comment ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_discussion_comment_is_deleted ON discussion_comment(is_deleted);

-- UserList table
ALTER TABLE user_list ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_list ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_user_list_is_deleted ON user_list(is_deleted);
