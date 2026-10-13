-- DropForeignKey
ALTER TABLE "public"."tv_episode" DROP CONSTRAINT "tv_episode_tv_show_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tv_season" DROP CONSTRAINT "tv_season_tv_show_id_fkey";

-- AlterTable
ALTER TABLE "content" ADD COLUMN     "cast" TEXT,
ADD COLUMN     "crew" TEXT,
ADD COLUMN     "seasons_data" TEXT;

-- AddForeignKey
ALTER TABLE "tv_season" ADD CONSTRAINT "tv_season_tv_show_id_fkey" FOREIGN KEY ("tv_show_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_episode" ADD CONSTRAINT "tv_episode_tv_show_id_fkey" FOREIGN KEY ("tv_show_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
