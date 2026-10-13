-- Keep existing numeric content type IDs and content rows stable while adding a URL-safe key.
ALTER TABLE "content_type_lookup" ADD COLUMN "slug" VARCHAR(50);
UPDATE "content_type_lookup"
SET "slug" = CASE "id"
  WHEN 1 THEN 'movie'
  WHEN 2 THEN 'tv'
  WHEN 3 THEN 'game'
  WHEN 4 THEN 'book'
  WHEN 5 THEN 'music'
  ELSE left(COALESCE(NULLIF(lower(trim(both '-' from regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'type'), 38)
    || '-' || "id"::text
END;
ALTER TABLE "content_type_lookup" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "content_type_lookup_slug_key" ON "content_type_lookup"("slug");

SELECT setval(
  pg_get_serial_sequence('content_type_lookup', 'id'),
  COALESCE((SELECT MAX("id") FROM "content_type_lookup"), 1),
  true
);

INSERT INTO "content_type_lookup" ("name", "slug") VALUES
  ('PODCAST', 'podcast'),
  ('THEATER', 'theater'),
  ('CONCERT', 'concert')
ON CONFLICT ("slug") DO NOTHING;

CREATE TYPE "MediaEventType" AS ENUM ('THEATER_PERFORMANCE', 'CONCERT');
CREATE TYPE "MediaEventStatus" AS ENUM ('SCHEDULED', 'POSTPONED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MusicReleaseType" AS ENUM ('ALBUM', 'SINGLE', 'TRACK');

ALTER TABLE "content" ADD COLUMN "music_release_type" "MusicReleaseType";

CREATE TABLE "podcast_program" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "content_id" VARCHAR(255) NOT NULL,
  "publication_status" VARCHAR(30) NOT NULL DEFAULT 'ongoing',
  "language_code" VARCHAR(20),
  "release_frequency" VARCHAR(30),
  "release_interval" INTEGER,
  "release_weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "podcast_program_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "podcast_program_content_id_key" ON "podcast_program"("content_id");
CREATE INDEX "podcast_program_publication_status_idx" ON "podcast_program"("publication_status");
ALTER TABLE "podcast_program" ADD CONSTRAINT "podcast_program_content_id_fkey"
  FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "podcast_program_credit" (
  "id" SERIAL NOT NULL,
  "program_id" UUID NOT NULL,
  "person_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(30) NOT NULL DEFAULT 'host',
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "podcast_program_credit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "podcast_program_credit_program_id_person_id_role_key" ON "podcast_program_credit"("program_id", "person_id", "role");
CREATE INDEX "podcast_program_credit_person_id_idx" ON "podcast_program_credit"("person_id");
ALTER TABLE "podcast_program_credit" ADD CONSTRAINT "podcast_program_credit_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "podcast_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "podcast_program_credit" ADD CONSTRAINT "podcast_program_credit_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "podcast_episode" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "program_id" UUID NOT NULL,
  "season_number" INTEGER NOT NULL DEFAULT 1,
  "episode_number" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "published_at" TIMESTAMP(3),
  "duration_seconds" INTEGER,
  "audio_url" VARCHAR(2000),
  "external_guid" VARCHAR(500),
  "is_explicit" BOOLEAN,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "podcast_episode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "podcast_episode_positive_numbers_check" CHECK ("season_number" > 0 AND "episode_number" > 0),
  CONSTRAINT "podcast_episode_positive_duration_check" CHECK ("duration_seconds" IS NULL OR "duration_seconds" > 0)
);
CREATE UNIQUE INDEX "podcast_episode_program_id_season_number_episode_number_key" ON "podcast_episode"("program_id", "season_number", "episode_number");
CREATE UNIQUE INDEX "podcast_episode_program_id_external_guid_key" ON "podcast_episode"("program_id", "external_guid");
CREATE INDEX "podcast_episode_program_id_published_at_idx" ON "podcast_episode"("program_id", "published_at");
ALTER TABLE "podcast_episode" ADD CONSTRAINT "podcast_episode_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "podcast_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "podcast_episode_credit" (
  "id" SERIAL NOT NULL,
  "episode_id" UUID NOT NULL,
  "person_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(30) NOT NULL DEFAULT 'guest',
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "podcast_episode_credit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "podcast_episode_credit_episode_id_person_id_role_key" ON "podcast_episode_credit"("episode_id", "person_id", "role");
CREATE INDEX "podcast_episode_credit_person_id_idx" ON "podcast_episode_credit"("person_id");
ALTER TABLE "podcast_episode_credit" ADD CONSTRAINT "podcast_episode_credit_episode_id_fkey"
  FOREIGN KEY ("episode_id") REFERENCES "podcast_episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "podcast_episode_credit" ADD CONSTRAINT "podcast_episode_credit_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_podcast_listen" (
  "id" SERIAL NOT NULL,
  "user_id" UUID NOT NULL,
  "episode_id" UUID NOT NULL,
  "listened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "seconds_listened" INTEGER,
  "completed" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_podcast_listen_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_podcast_listen_positive_duration_check" CHECK ("seconds_listened" IS NULL OR "seconds_listened" >= 0)
);
CREATE INDEX "user_podcast_listen_user_id_episode_id_listened_at_idx" ON "user_podcast_listen"("user_id", "episode_id", "listened_at" DESC);
CREATE INDEX "user_podcast_listen_episode_id_idx" ON "user_podcast_listen"("episode_id");
ALTER TABLE "user_podcast_listen" ADD CONSTRAINT "user_podcast_listen_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_podcast_listen" ADD CONSTRAINT "user_podcast_listen_episode_id_fkey"
  FOREIGN KEY ("episode_id") REFERENCES "podcast_episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "media_event" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" "MediaEventType" NOT NULL,
  "theater_production_id" VARCHAR(255),
  "title" VARCHAR(255),
  "starts_at" TIMESTAMP(3) NOT NULL,
  "time_zone" VARCHAR(100) NOT NULL DEFAULT 'Europe/Istanbul',
  "venue_name" VARCHAR(255) NOT NULL,
  "city" VARCHAR(150) NOT NULL,
  "address" VARCHAR(500),
  "status" "MediaEventStatus" NOT NULL DEFAULT 'SCHEDULED',
  "rescheduled_from_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "media_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_event_shape_check" CHECK (
    ("event_type" = 'THEATER_PERFORMANCE' AND "theater_production_id" IS NOT NULL AND "title" IS NULL) OR
    ("event_type" = 'CONCERT' AND "theater_production_id" IS NULL AND "title" IS NOT NULL)
  )
);
CREATE INDEX "media_event_event_type_starts_at_idx" ON "media_event"("event_type", "starts_at");
CREATE INDEX "media_event_city_starts_at_idx" ON "media_event"("city", "starts_at");
CREATE INDEX "media_event_theater_production_id_starts_at_idx" ON "media_event"("theater_production_id", "starts_at");
CREATE INDEX "media_event_status_starts_at_idx" ON "media_event"("status", "starts_at");
ALTER TABLE "media_event" ADD CONSTRAINT "media_event_theater_production_id_fkey"
  FOREIGN KEY ("theater_production_id") REFERENCES "content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_event" ADD CONSTRAINT "media_event_rescheduled_from_id_fkey"
  FOREIGN KEY ("rescheduled_from_id") REFERENCES "media_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "media_event_credit" (
  "id" SERIAL NOT NULL,
  "event_id" UUID NOT NULL,
  "person_id" VARCHAR(255),
  "display_name" VARCHAR(255) NOT NULL,
  "role" VARCHAR(100),
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "media_event_credit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "media_event_credit_event_id_position_idx" ON "media_event_credit"("event_id", "position");
CREATE INDEX "media_event_credit_person_id_idx" ON "media_event_credit"("person_id");
ALTER TABLE "media_event_credit" ADD CONSTRAINT "media_event_credit_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "media_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_event_credit" ADD CONSTRAINT "media_event_credit_person_id_fkey"
  FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "user_event_attendance" (
  "id" SERIAL NOT NULL,
  "user_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "attended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "content_log_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_event_attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_event_attendance_user_id_event_id_key" ON "user_event_attendance"("user_id", "event_id");
CREATE UNIQUE INDEX "user_event_attendance_content_log_id_key" ON "user_event_attendance"("content_log_id");
CREATE INDEX "user_event_attendance_user_id_attended_at_idx" ON "user_event_attendance"("user_id", "attended_at" DESC);
CREATE INDEX "user_event_attendance_event_id_idx" ON "user_event_attendance"("event_id");
ALTER TABLE "user_event_attendance" ADD CONSTRAINT "user_event_attendance_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_event_attendance" ADD CONSTRAINT "user_event_attendance_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "media_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_event_attendance" ADD CONSTRAINT "user_event_attendance_content_log_id_fkey"
  FOREIGN KEY ("content_log_id") REFERENCES "user_content_log"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "music_release_track" (
  "id" SERIAL NOT NULL,
  "release_content_id" VARCHAR(255) NOT NULL,
  "track_content_id" VARCHAR(255) NOT NULL,
  "disc_number" INTEGER NOT NULL DEFAULT 1,
  "track_number" INTEGER NOT NULL,
  CONSTRAINT "music_release_track_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "music_release_track_numbers_check" CHECK ("disc_number" > 0 AND "track_number" > 0),
  CONSTRAINT "music_release_track_distinct_content_check" CHECK ("release_content_id" <> "track_content_id")
);
CREATE UNIQUE INDEX "music_release_track_release_content_id_disc_number_track_number_key" ON "music_release_track"("release_content_id", "disc_number", "track_number");
CREATE INDEX "music_release_track_track_content_id_idx" ON "music_release_track"("track_content_id");
ALTER TABLE "music_release_track" ADD CONSTRAINT "music_release_track_release_content_id_fkey"
  FOREIGN KEY ("release_content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "music_release_track" ADD CONSTRAINT "music_release_track_track_content_id_fkey"
  FOREIGN KEY ("track_content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
