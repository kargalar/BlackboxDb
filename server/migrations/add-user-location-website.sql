-- Add location and website fields to app_user table
-- Migration: add-user-location-website
-- Date: 2025-12-24

ALTER TABLE app_user
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS website VARCHAR(500);

-- Add comment
COMMENT ON COLUMN app_user.location IS 'Kullanıcının konumu (şehir, ülke vb.)';
COMMENT ON COLUMN app_user.website IS 'Kullanıcının kişisel web sitesi veya sosyal medya linki';
