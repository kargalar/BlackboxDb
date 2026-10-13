-- Migration: Add is_spoiler column to content_screenshot
-- Date: 2025-12-29

ALTER TABLE content_screenshot ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT FALSE;
