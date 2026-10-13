-- Add default content types if they don't exist
INSERT INTO "content_type_lookup" ("id", "name")
VALUES 
  (1, 'MOVIE'),
  (2, 'TV'),
  (3, 'GAME'),
  (4, 'BOOK')
ON CONFLICT DO NOTHING;
