INSERT INTO "content_type_lookup" ("id", "name")
VALUES (5, 'MUSIC')
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";
