-- Migration: Add Google OAuth fields and user preferences
-- Date: 2026-02-26

-- Google OAuth fields
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'email';

-- User preference fields
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS preferred_content_types INTEGER[] DEFAULT '{}';
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS grid_columns INTEGER NOT NULL DEFAULT 5;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS poster_zoom_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add isAbandoned to user_content_log
ALTER TABLE user_content_log ADD COLUMN IF NOT EXISTS is_abandoned BOOLEAN NOT NULL DEFAULT false;

-- Add isPending to person and company tables
ALTER TABLE person ADD COLUMN IF NOT EXISTS is_pending BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE company ADD COLUMN IF NOT EXISTS is_pending BOOLEAN NOT NULL DEFAULT false;
