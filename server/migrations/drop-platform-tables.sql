-- Migration: Drop Platform Tables
-- Date: 2025-12-27
-- Description: Remove platform and content_platform tables as the platform feature is no longer used

-- Drop the junction table first (has foreign keys)
DROP TABLE IF EXISTS content_platform CASCADE;

-- Drop the platform table
DROP TABLE IF EXISTS platform CASCADE;
