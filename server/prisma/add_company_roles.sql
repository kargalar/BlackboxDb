-- Insert new company roles for different content types
-- Use ON CONFLICT to safely skip if already exists
INSERT INTO company_role (name, created_at)
VALUES 
  ('bookpublisher', NOW()),
  ('gamepublisher', NOW()),
  ('gamedeveloper', NOW()),
  ('moviepublisher', NOW())
ON CONFLICT (name) DO NOTHING;
