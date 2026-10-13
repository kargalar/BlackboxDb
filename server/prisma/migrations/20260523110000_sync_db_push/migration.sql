-- DropForeignKey
ALTER TABLE "public"."content_company" DROP CONSTRAINT IF EXISTS "content_company_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."content_country" DROP CONSTRAINT IF EXISTS "content_country_content_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."content_country" DROP CONSTRAINT IF EXISTS "content_country_country_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."content_person" DROP CONSTRAINT IF EXISTS "content_person_person_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."content_video" DROP CONSTRAINT IF EXISTS "content_video_content_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review" DROP CONSTRAINT IF EXISTS "review_content_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review" DROP CONSTRAINT IF EXISTS "review_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review_comment" DROP CONSTRAINT IF EXISTS "review_comment_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review_comment" DROP CONSTRAINT IF EXISTS "review_comment_review_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review_comment" DROP CONSTRAINT IF EXISTS "review_comment_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review_comment_like" DROP CONSTRAINT IF EXISTS "review_comment_like_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review_comment_like" DROP CONSTRAINT IF EXISTS "review_comment_like_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review_like" DROP CONSTRAINT IF EXISTS "review_like_review_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."review_like" DROP CONSTRAINT IF EXISTS "review_like_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tv_episode" DROP CONSTRAINT IF EXISTS "tv_episode_tvShowId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tv_season" DROP CONSTRAINT IF EXISTS "tv_season_tvShowId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_content_log" DROP CONSTRAINT IF EXISTS "user_content_log_review_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_budget_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_first_air_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_imdb_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_published_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_company_content_id_company_id_role_key";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_image_difficulty_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_image_is_enabled_for_quiz_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_person_content_id_person_id_role_character_key";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_person_role_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."franchise_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "public"."game_mode_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "public"."genre_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "public"."language_iso_code_key";

-- DropIndex
DROP INDEX IF EXISTS "public"."perspective_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "public"."platform_slug_key";

-- DropIndex
DROP INDEX IF EXISTS "public"."theme_slug_key";

-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'email',
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "google_id" TEXT,
ADD COLUMN     "grid_columns" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "grid_rows" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" VARCHAR(255),
ADD COLUMN     "poster_icons_below" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "poster_zoom_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "preferred_content_types" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "show_sensitive_content" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website" VARCHAR(500);

-- AlterTable
ALTER TABLE "company" DROP CONSTRAINT IF EXISTS "company_pkey",
ADD COLUMN     "default_role_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "founding_year" INTEGER,
ADD COLUMN     "is_pending" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "company_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "company_id_seq";

-- AlterTable
ALTER TABLE "content" DROP COLUMN "book_series",
DROP COLUMN "book_series_number",
DROP COLUMN "categories",
DROP COLUMN "collection_name",
DROP COLUMN "episode_run_time",
DROP COLUMN "game_category",
DROP COLUMN "game_franchise",
DROP COLUMN "game_modes",
DROP COLUMN "game_series",
DROP COLUMN "imdb_id",
DROP COLUMN "language",
DROP COLUMN "maturity_rating",
DROP COLUMN "perspectives",
DROP COLUMN "published_date",
DROP COLUMN "publisher",
DROP COLUMN "review_count",
DROP COLUMN "storyline",
DROP COLUMN "subtitle",
DROP COLUMN "summary",
DROP COLUMN "themes",
ADD COLUMN     "age_rating_id" INTEGER,
ADD COLUMN     "average_duration" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "igdb_id" INTEGER,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "original_title" VARCHAR(255),
ADD COLUMN     "spotify_playlist_url" TEXT,
ADD COLUMN     "tmdb_id" INTEGER,
ADD COLUMN     "total_playtime_logs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_playtime_minutes" INTEGER,
ADD COLUMN     "total_rating_score" DECIMAL(10,2),
ADD COLUMN     "total_rating_votes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trailer_url" TEXT;

-- AlterTable
ALTER TABLE "content_company" DROP COLUMN "role",
ADD COLUMN     "company_role_id" INTEGER NOT NULL,
ALTER COLUMN "company_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "content_image" DROP COLUMN "aspect_ratio",
DROP COLUMN "description",
DROP COLUMN "difficulty",
DROP COLUMN "height",
DROP COLUMN "is_enabled_for_quiz",
DROP COLUMN "is_primary",
DROP COLUMN "language",
DROP COLUMN "order",
DROP COLUMN "width";

-- AlterTable
ALTER TABLE "content_person" ADD COLUMN     "person_role_id" INTEGER,
ALTER COLUMN "person_id" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "role" DROP NOT NULL;

-- AlterTable
ALTER TABLE "content_screenshot" DROP COLUMN "description",
ADD COLUMN     "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_spoiler" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "franchise" DROP COLUMN "description",
DROP COLUMN "slug",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "game_mode" DROP COLUMN "slug",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "genre" DROP COLUMN "contentTypeIds",
DROP COLUMN "description",
DROP COLUMN "slug",
DROP COLUMN "updated_at",
ADD COLUMN     "content_type_id" INTEGER;

-- AlterTable
ALTER TABLE "language" DROP COLUMN "iso_code",
DROP COLUMN "iso_code3";

-- AlterTable
ALTER TABLE "notification" DROP COLUMN "review_id",
ADD COLUMN     "content_id" VARCHAR(255),
ADD COLUMN     "discussion_comment_id" INTEGER;

-- AlterTable
ALTER TABLE "person" DROP CONSTRAINT IF EXISTS "person_pkey",
ADD COLUMN     "is_pending" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "person_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "person_id_seq";

-- AlterTable
ALTER TABLE "perspective" DROP COLUMN "slug",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "platform" DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "quiz_settings" DROP COLUMN "points_easy",
DROP COLUMN "points_hard",
DROP COLUMN "points_medium",
ADD COLUMN     "points_level1" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "points_level2" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "points_level3" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "points_level4" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "points_level5" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "theme" DROP COLUMN "slug",
DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "tv_episode" ADD COLUMN     "total_rating_score" DECIMAL(10,2),
ADD COLUMN     "total_rating_votes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_content_log" DROP COLUMN "review_id",
ADD COLUMN     "is_abandoned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_on_release" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platform_id" INTEGER,
ADD COLUMN     "playtime_minutes" INTEGER,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "rating" SET DATA TYPE DECIMAL(4,2);

-- AlterTable
ALTER TABLE "user_episode_log" ADD COLUMN     "rating" DECIMAL(4,2);

-- AlterTable
ALTER TABLE "user_list" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "downvote_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_ordered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "upvote_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_list_item" ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE IF EXISTS "public"."content_country";

-- DropTable
DROP TABLE IF EXISTS "public"."content_video";

-- DropTable
DROP TABLE IF EXISTS "public"."country";

-- DropTable
DROP TABLE IF EXISTS "public"."review";

-- DropTable
DROP TABLE IF EXISTS "public"."review_comment";

-- DropTable
DROP TABLE IF EXISTS "public"."review_comment_like";

-- DropTable
DROP TABLE IF EXISTS "public"."review_like";

-- CreateTable
CREATE TABLE "company_role" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "content_type_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_role" (
    "id" SERIAL NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "content_type_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mood" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "age_rating" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "age_rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_similarity" (
    "content1_id" VARCHAR(255) NOT NULL,
    "content2_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_similarity_pkey" PRIMARY KEY ("content1_id","content2_id")
);

-- CreateTable
CREATE TABLE "content_mood" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "mood_id" INTEGER NOT NULL,

    CONSTRAINT "content_mood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_game_mode" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "game_mode_id" INTEGER NOT NULL,

    CONSTRAINT "content_game_mode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_perspective" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "perspective_id" INTEGER NOT NULL,

    CONSTRAINT "content_perspective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expansion" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "poster_url" TEXT,
    "release_date" DATE,
    "type" VARCHAR(20) NOT NULL DEFAULT 'expansion',
    "consume_count" INTEGER NOT NULL DEFAULT 0,
    "rating_distribution" INTEGER[] DEFAULT ARRAY[0, 0, 0, 0, 0]::INTEGER[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expansion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_expansion_log" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "expansion_id" INTEGER NOT NULL,
    "rating" DECIMAL(4,2),
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_expansion_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_list_vote" (
    "id" SERIAL NOT NULL,
    "list_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "vote_type" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_list_vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" SERIAL NOT NULL,
    "reporter_id" UUID NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "target_id" VARCHAR(255) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_job" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "total_items" INTEGER NOT NULL,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "errors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TaggedUsers" (
    "A" UUID NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TaggedUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_role_name_key" ON "company_role"("name");

-- CreateIndex
CREATE INDEX "company_role_content_type_id_idx" ON "company_role"("content_type_id");

-- CreateIndex
CREATE INDEX "person_role_content_type_id_idx" ON "person_role"("content_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "age_rating_name_key" ON "age_rating"("name");

-- CreateIndex
CREATE INDEX "content_similarity_content1_id_idx" ON "content_similarity"("content1_id");

-- CreateIndex
CREATE INDEX "content_similarity_content2_id_idx" ON "content_similarity"("content2_id");

-- CreateIndex
CREATE INDEX "content_mood_content_id_idx" ON "content_mood"("content_id");

-- CreateIndex
CREATE INDEX "content_mood_mood_id_idx" ON "content_mood"("mood_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_mood_content_id_mood_id_key" ON "content_mood"("content_id", "mood_id");

-- CreateIndex
CREATE INDEX "content_game_mode_content_id_idx" ON "content_game_mode"("content_id");

-- CreateIndex
CREATE INDEX "content_game_mode_game_mode_id_idx" ON "content_game_mode"("game_mode_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_game_mode_content_id_game_mode_id_key" ON "content_game_mode"("content_id", "game_mode_id");

-- CreateIndex
CREATE INDEX "content_perspective_content_id_idx" ON "content_perspective"("content_id");

-- CreateIndex
CREATE INDEX "content_perspective_perspective_id_idx" ON "content_perspective"("perspective_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_perspective_content_id_perspective_id_key" ON "content_perspective"("content_id", "perspective_id");

-- CreateIndex
CREATE INDEX "expansion_content_id_idx" ON "expansion"("content_id");

-- CreateIndex
CREATE INDEX "expansion_type_idx" ON "expansion"("type");

-- CreateIndex
CREATE INDEX "user_expansion_log_user_id_idx" ON "user_expansion_log"("user_id");

-- CreateIndex
CREATE INDEX "user_expansion_log_expansion_id_idx" ON "user_expansion_log"("expansion_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_expansion_log_user_id_expansion_id_key" ON "user_expansion_log"("user_id", "expansion_id");

-- CreateIndex
CREATE INDEX "user_list_vote_list_id_idx" ON "user_list_vote"("list_id");

-- CreateIndex
CREATE INDEX "user_list_vote_user_id_idx" ON "user_list_vote"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_list_vote_list_id_user_id_key" ON "user_list_vote"("list_id", "user_id");

-- CreateIndex
CREATE INDEX "report_reporter_id_idx" ON "report"("reporter_id");

-- CreateIndex
CREATE INDEX "report_targetType_target_id_idx" ON "report"("targetType", "target_id");

-- CreateIndex
CREATE INDEX "report_status_idx" ON "report"("status");

-- CreateIndex
CREATE INDEX "_TaggedUsers_B_index" ON "_TaggedUsers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_google_id_key" ON "app_user"("google_id");

-- CreateIndex
CREATE INDEX "content_tmdb_id_idx" ON "content"("tmdb_id");

-- CreateIndex
CREATE INDEX "content_igdb_id_idx" ON "content"("igdb_id");

-- CreateIndex
CREATE INDEX "content_age_rating_id_idx" ON "content"("age_rating_id");

-- CreateIndex
CREATE INDEX "content_is_deleted_idx" ON "content"("is_deleted");

-- CreateIndex
CREATE INDEX "content_company_company_role_id_idx" ON "content_company"("company_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_company_content_id_company_id_company_role_id_key" ON "content_company"("content_id", "company_id", "company_role_id");

-- CreateIndex
CREATE INDEX "content_person_person_role_id_idx" ON "content_person"("person_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_person_content_id_person_id_person_role_id_characte_key" ON "content_person"("content_id", "person_id", "person_role_id", "character");

-- CreateIndex
CREATE INDEX "genre_content_type_id_idx" ON "genre"("content_type_id");

-- CreateIndex
CREATE INDEX "notification_content_id_idx" ON "notification"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_name_key" ON "platform"("name");

-- CreateIndex
CREATE INDEX "user_content_log_notify_on_release_idx" ON "user_content_log"("notify_on_release");

-- CreateIndex
CREATE INDEX "user_content_log_platform_id_idx" ON "user_content_log"("platform_id");

-- AddForeignKey
ALTER TABLE "content_similarity" ADD CONSTRAINT "content_similarity_content1_id_fkey" FOREIGN KEY ("content1_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_similarity" ADD CONSTRAINT "content_similarity_content2_id_fkey" FOREIGN KEY ("content2_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_age_rating_id_fkey" FOREIGN KEY ("age_rating_id") REFERENCES "age_rating"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_person" ADD CONSTRAINT "content_person_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_person" ADD CONSTRAINT "content_person_person_role_id_fkey" FOREIGN KEY ("person_role_id") REFERENCES "person_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_company" ADD CONSTRAINT "content_company_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_company" ADD CONSTRAINT "content_company_company_role_id_fkey" FOREIGN KEY ("company_role_id") REFERENCES "company_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_log" ADD CONSTRAINT "user_content_log_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_mood" ADD CONSTRAINT "content_mood_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_mood" ADD CONSTRAINT "content_mood_mood_id_fkey" FOREIGN KEY ("mood_id") REFERENCES "mood"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_game_mode" ADD CONSTRAINT "content_game_mode_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_game_mode" ADD CONSTRAINT "content_game_mode_game_mode_id_fkey" FOREIGN KEY ("game_mode_id") REFERENCES "game_mode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_perspective" ADD CONSTRAINT "content_perspective_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_perspective" ADD CONSTRAINT "content_perspective_perspective_id_fkey" FOREIGN KEY ("perspective_id") REFERENCES "perspective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expansion" ADD CONSTRAINT "expansion_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_expansion_log" ADD CONSTRAINT "user_expansion_log_expansion_id_fkey" FOREIGN KEY ("expansion_id") REFERENCES "expansion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_expansion_log" ADD CONSTRAINT "user_expansion_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list_vote" ADD CONSTRAINT "user_list_vote_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "user_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list_vote" ADD CONSTRAINT "user_list_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaggedUsers" ADD CONSTRAINT "_TaggedUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaggedUsers" ADD CONSTRAINT "_TaggedUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "user_content_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "content_recommendation_content_id_recipient_user_id_recommender" RENAME TO "content_recommendation_content_id_recipient_user_id_recomme_key";

