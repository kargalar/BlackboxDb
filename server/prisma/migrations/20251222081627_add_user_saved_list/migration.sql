/*
  Warnings:

  - You are about to drop the column `adult` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `backdrop_url` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `collection_name` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `game_category` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `game_franchise` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `game_series` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `original_title` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `poster_url` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `storyline` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `content` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."tv_episode" DROP CONSTRAINT IF EXISTS "tv_episode_tvShowId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tv_season" DROP CONSTRAINT IF EXISTS "tv_season_tvShowId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_adult_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_budget_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_first_air_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_published_date_idx";

-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "cover_photo_url" TEXT;

-- AlterTable
ALTER TABLE "content" DROP COLUMN IF EXISTS "adult",
DROP COLUMN IF EXISTS "backdrop_url",
DROP COLUMN IF EXISTS "collection_name",
DROP COLUMN IF EXISTS "game_category",
DROP COLUMN IF EXISTS "game_franchise",
DROP COLUMN IF EXISTS "game_series",
DROP COLUMN IF EXISTS "original_title",
DROP COLUMN IF EXISTS "poster_url",
DROP COLUMN IF EXISTS "storyline",
DROP COLUMN IF EXISTS "summary",
ADD COLUMN     "backdrop_image_id" INTEGER,
ADD COLUMN     "is_enabled_for_quiz" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "poster_image_id" INTEGER,
ADD COLUMN     "screenshot_image_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "series_id" INTEGER;

-- AlterTable
ALTER TABLE "content_image" ADD COLUMN     "description" TEXT,
ADD COLUMN     "difficulty" INTEGER DEFAULT 1,
ADD COLUMN     "is_enabled_for_quiz" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "genre" ADD COLUMN     "contentTypeIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "review_comment" ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "game_mode" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_mode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perspective" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perspective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_series" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_screenshot" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "image_url" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "is_enabled_for_quiz" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "content_screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comment_like" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_comment_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_theme" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "theme_id" INTEGER NOT NULL,

    CONSTRAINT "content_theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_settings" (
    "id" SERIAL NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "time_per_question" INTEGER NOT NULL DEFAULT 30,
    "questions_count" INTEGER NOT NULL DEFAULT 10,
    "points_easy" INTEGER NOT NULL DEFAULT 10,
    "points_medium" INTEGER NOT NULL DEFAULT 25,
    "points_hard" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_result" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_questions" INTEGER NOT NULL,
    "time_taken" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_leaderboard" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "total_quizzes" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_list" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "content_type_id" INTEGER NOT NULL,
    "owner_id" UUID NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_saved_list" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "list_id" INTEGER NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_list_item" (
    "id" SERIAL NOT NULL,
    "list_id" INTEGER NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "added_by_id" UUID NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_list_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_list_collaborator" (
    "id" SERIAL NOT NULL,
    "list_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'editor',
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_list_collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_mode_slug_key" ON "game_mode"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "perspective_slug_key" ON "perspective"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "theme_slug_key" ON "theme"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_series_slug_key" ON "content_series"("slug");

-- CreateIndex
CREATE INDEX "content_screenshot_content_id_idx" ON "content_screenshot"("content_id");

-- CreateIndex
CREATE INDEX "content_screenshot_difficulty_idx" ON "content_screenshot"("difficulty");

-- CreateIndex
CREATE INDEX "content_screenshot_is_enabled_for_quiz_idx" ON "content_screenshot"("is_enabled_for_quiz");

-- CreateIndex
CREATE INDEX "review_comment_like_comment_id_idx" ON "review_comment_like"("comment_id");

-- CreateIndex
CREATE INDEX "review_comment_like_user_id_idx" ON "review_comment_like"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_comment_like_comment_id_user_id_key" ON "review_comment_like"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "content_theme_content_id_idx" ON "content_theme"("content_id");

-- CreateIndex
CREATE INDEX "content_theme_theme_id_idx" ON "content_theme"("theme_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_theme_content_id_theme_id_key" ON "content_theme"("content_id", "theme_id");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_settings_content_type_id_key" ON "quiz_settings"("content_type_id");

-- CreateIndex
CREATE INDEX "quiz_result_user_id_idx" ON "quiz_result"("user_id");

-- CreateIndex
CREATE INDEX "quiz_result_content_type_id_idx" ON "quiz_result"("content_type_id");

-- CreateIndex
CREATE INDEX "quiz_result_score_idx" ON "quiz_result"("score");

-- CreateIndex
CREATE INDEX "quiz_result_created_at_idx" ON "quiz_result"("created_at");

-- CreateIndex
CREATE INDEX "quiz_leaderboard_content_type_id_idx" ON "quiz_leaderboard"("content_type_id");

-- CreateIndex
CREATE INDEX "quiz_leaderboard_total_score_idx" ON "quiz_leaderboard"("total_score");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_leaderboard_user_id_content_type_id_key" ON "quiz_leaderboard"("user_id", "content_type_id");

-- CreateIndex
CREATE INDEX "user_list_owner_id_idx" ON "user_list"("owner_id");

-- CreateIndex
CREATE INDEX "user_list_content_type_id_idx" ON "user_list"("content_type_id");

-- CreateIndex
CREATE INDEX "user_list_is_public_idx" ON "user_list"("is_public");

-- CreateIndex
CREATE INDEX "user_saved_list_user_id_idx" ON "user_saved_list"("user_id");

-- CreateIndex
CREATE INDEX "user_saved_list_list_id_idx" ON "user_saved_list"("list_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_saved_list_user_id_list_id_key" ON "user_saved_list"("user_id", "list_id");

-- CreateIndex
CREATE INDEX "user_list_item_list_id_idx" ON "user_list_item"("list_id");

-- CreateIndex
CREATE INDEX "user_list_item_content_id_idx" ON "user_list_item"("content_id");

-- CreateIndex
CREATE INDEX "user_list_item_added_by_id_idx" ON "user_list_item"("added_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_list_item_list_id_content_id_key" ON "user_list_item"("list_id", "content_id");

-- CreateIndex
CREATE INDEX "user_list_collaborator_list_id_idx" ON "user_list_collaborator"("list_id");

-- CreateIndex
CREATE INDEX "user_list_collaborator_user_id_idx" ON "user_list_collaborator"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_list_collaborator_list_id_user_id_key" ON "user_list_collaborator"("list_id", "user_id");

-- CreateIndex
CREATE INDEX "content_series_id_idx" ON "content"("series_id");

-- CreateIndex
CREATE INDEX "content_image_difficulty_idx" ON "content_image"("difficulty");

-- CreateIndex
CREATE INDEX "content_image_is_enabled_for_quiz_idx" ON "content_image"("is_enabled_for_quiz");

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "content_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_screenshot" ADD CONSTRAINT "content_screenshot_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comment_like" ADD CONSTRAINT "review_comment_like_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "review_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comment_like" ADD CONSTRAINT "review_comment_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_theme" ADD CONSTRAINT "content_theme_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_theme" ADD CONSTRAINT "content_theme_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_settings" ADD CONSTRAINT "quiz_settings_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "content_type_lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_result" ADD CONSTRAINT "quiz_result_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_leaderboard" ADD CONSTRAINT "quiz_leaderboard_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list" ADD CONSTRAINT "user_list_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list" ADD CONSTRAINT "user_list_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "content_type_lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_list" ADD CONSTRAINT "user_saved_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_saved_list" ADD CONSTRAINT "user_saved_list_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "user_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list_item" ADD CONSTRAINT "user_list_item_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "user_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list_item" ADD CONSTRAINT "user_list_item_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list_item" ADD CONSTRAINT "user_list_item_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list_collaborator" ADD CONSTRAINT "user_list_collaborator_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "user_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_list_collaborator" ADD CONSTRAINT "user_list_collaborator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;
