-- Add default_role_ids column to company table
-- Stores which roles a company is associated with (e.g., developer, publisher)
ALTER TABLE company ADD COLUMN IF NOT EXISTS default_role_ids INTEGER[] DEFAULT '{}';
