/*
  Warnings:

  - You are about to drop the column `collection_name` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `game_category` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `game_franchise` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `game_series` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `series_id` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `storyline` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `content` table. All the data in the column will be lost.
  - You are about to drop the `content_language` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `content_series` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."content" DROP CONSTRAINT IF EXISTS "content_series_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."content_language" DROP CONSTRAINT IF EXISTS "content_language_content_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."content_language" DROP CONSTRAINT IF EXISTS "content_language_language_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tv_episode" DROP CONSTRAINT IF EXISTS "tv_episode_tvShowId_fkey";

-- DropForeignKey
ALTER TABLE "public"."tv_season" DROP CONSTRAINT IF EXISTS "tv_season_tvShowId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_budget_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_first_air_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_published_date_idx";

-- DropIndex
DROP INDEX IF EXISTS "public"."content_series_id_idx";

-- AlterTable
ALTER TABLE "content" DROP COLUMN IF EXISTS "collection_name",
DROP COLUMN IF EXISTS "game_category",
DROP COLUMN IF EXISTS "game_franchise",
DROP COLUMN IF EXISTS "game_series",
DROP COLUMN IF EXISTS "series_id",
DROP COLUMN IF EXISTS "storyline",
DROP COLUMN IF EXISTS "summary",
ADD COLUMN     "franchise_id" UUID,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE IF EXISTS "public"."content_language";

-- DropTable
DROP TABLE IF EXISTS "public"."content_series";

-- CreateTable
CREATE TABLE "franchise" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "franchise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_request" (
    "id" SERIAL NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "release_date" VARCHAR(50),
    "description" TEXT,
    "reason" TEXT,
    "payload" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_featured_content" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_featured_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "franchise_slug_key" ON "franchise"("slug");

-- CreateIndex
CREATE INDEX "content_request_requester_user_id_idx" ON "content_request"("requester_user_id");

-- CreateIndex
CREATE INDEX "content_request_status_idx" ON "content_request"("status");

-- CreateIndex
CREATE INDEX "content_request_created_at_idx" ON "content_request"("created_at");

-- CreateIndex
CREATE INDEX "user_featured_content_user_id_idx" ON "user_featured_content"("user_id");

-- CreateIndex
CREATE INDEX "user_featured_content_content_id_idx" ON "user_featured_content"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_featured_content_user_id_content_id_key" ON "user_featured_content"("user_id", "content_id");

-- CreateIndex
CREATE INDEX "content_franchise_id_idx" ON "content"("franchise_id");

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_franchise_id_fkey" FOREIGN KEY ("franchise_id") REFERENCES "franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_featured_content" ADD CONSTRAINT "user_featured_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_featured_content" ADD CONSTRAINT "user_featured_content_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
