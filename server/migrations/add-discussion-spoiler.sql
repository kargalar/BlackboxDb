-- Migration: Add is_spoiler column to discussion comments/discussions
-- Date: 2026-03-12

ALTER TABLE discussion ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT FALSE;