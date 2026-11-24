ALTER TABLE "app_user" ADD COLUMN "poster_icons_position" VARCHAR(16) NOT NULL DEFAULT 'below';
UPDATE "app_user" SET "poster_icons_position" = 'above' WHERE "poster_icons_below" = false;
