-- CreateTable
CREATE TABLE "content_type_lookup" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "content_type_lookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "auth_user_id" UUID NOT NULL,
    "picture_url" TEXT,
    "username" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "bio" TEXT,
    "personality_analyze" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_moderator" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("auth_user_id")
);

-- CreateTable
CREATE TABLE "person" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "biography" TEXT,
    "birth_date" DATE,
    "death_date" DATE,
    "gender" VARCHAR(20),
    "profile_url" TEXT,
    "place_of_birth" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "headquarters" VARCHAR(255),
    "logo_url" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genre" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "iso_code" VARCHAR(2) NOT NULL,
    "iso_code3" VARCHAR(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "iso_code" VARCHAR(2) NOT NULL,
    "iso_code3" VARCHAR(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "platform_type" VARCHAR(50) NOT NULL,
    "logo_url" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "original_title" VARCHAR(255),
    "content_type_id" INTEGER NOT NULL,
    "release_date" DATE,
    "description" TEXT,
    "tagline" TEXT,
    "status" VARCHAR(50),
    "runtime" INTEGER,
    "adult" BOOLEAN DEFAULT false,
    "imdb_id" VARCHAR(20),
    "isbn" VARCHAR(20),
    "page_count" INTEGER,
    "is_continuing" BOOLEAN NOT NULL DEFAULT false,
    "consume_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "rating_distribution" INTEGER[] DEFAULT ARRAY[0, 0, 0, 0, 0]::INTEGER[],
    "poster_url" TEXT,
    "backdrop_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_detail" (
    "content_id" VARCHAR(255) NOT NULL,
    "collection_name" VARCHAR(255),
    "budget" BIGINT,
    "revenue" BIGINT,
    "episode_run_time" INTEGER[],
    "number_of_episodes" INTEGER,
    "number_of_seasons" INTEGER,
    "type" VARCHAR(50),
    "in_production" BOOLEAN,
    "first_air_date" DATE,
    "last_air_date" DATE,
    "subtitle" VARCHAR(500),
    "authors" TEXT[],
    "publisher" VARCHAR(255),
    "published_date" VARCHAR(50),
    "categories" TEXT[],
    "maturity_rating" VARCHAR(50),
    "language" VARCHAR(10),
    "book_series" VARCHAR(255),
    "book_series_number" INTEGER,
    "preview_link" TEXT,
    "info_link" TEXT,
    "canonical_volume_link" TEXT,
    "category" INTEGER,
    "storyline" TEXT,
    "summary" TEXT,
    "version_title" VARCHAR(255),
    "version_parent" INTEGER,
    "collection" INTEGER,
    "game_modes" TEXT[],
    "perspectives" TEXT[],
    "themes" TEXT[],
    "game_franchise" VARCHAR(255),
    "game_series" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_detail_pkey" PRIMARY KEY ("content_id")
);

-- CreateTable
CREATE TABLE "tv_season" (
    "id" SERIAL NOT NULL,
    "tv_show_id" VARCHAR(255) NOT NULL,
    "season_number" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "overview" TEXT,
    "air_date" DATE,
    "episode_count" INTEGER NOT NULL,
    "poster_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tv_season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tv_episode" (
    "id" SERIAL NOT NULL,
    "tv_show_id" VARCHAR(255) NOT NULL,
    "season_number" INTEGER NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "overview" TEXT,
    "air_date" DATE,
    "runtime" INTEGER,
    "still_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "season_id" INTEGER,

    CONSTRAINT "tv_episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_episode_log" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "episode_id" INTEGER NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "watched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_episode_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_genre" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "genre_id" INTEGER NOT NULL,

    CONSTRAINT "content_genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_person" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "person_id" INTEGER NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "character" VARCHAR(255),
    "department" VARCHAR(100),
    "job" VARCHAR(100),
    "credit_order" INTEGER,

    CONSTRAINT "content_person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_company" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "role" VARCHAR(50) NOT NULL,

    CONSTRAINT "content_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_country" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "country_id" INTEGER NOT NULL,
    "role" VARCHAR(50) NOT NULL,

    CONSTRAINT "content_country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_language" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "language_id" INTEGER NOT NULL,
    "role" VARCHAR(50) NOT NULL,

    CONSTRAINT "content_language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_platform" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "availability" VARCHAR(50),
    "link" TEXT,

    CONSTRAINT "content_platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_image" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "file_url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "aspect_ratio" DECIMAL(5,3),
    "language" VARCHAR(2),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "content_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_video" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "site" VARCHAR(50) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "size" INTEGER,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "content_video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" SERIAL NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "type_id" INTEGER NOT NULL,
    "review_id" INTEGER,
    "reply_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "text" TEXT NOT NULL,
    "rating" DECIMAL(3,2),
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_content_log" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "rating" DECIMAL(3,2),
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_consume_later" BOOLEAN NOT NULL DEFAULT false,
    "is_continuing" BOOLEAN NOT NULL DEFAULT false,
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "review_id" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_content_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follow" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "following_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_like" (
    "id" SERIAL NOT NULL,
    "review_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_comment" (
    "id" SERIAL NOT NULL,
    "review_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_username_key" ON "app_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "genre_slug_key" ON "genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "country_iso_code_key" ON "country"("iso_code");

-- CreateIndex
CREATE UNIQUE INDEX "language_iso_code_key" ON "language"("iso_code");

-- CreateIndex
CREATE INDEX "content_content_type_id_idx" ON "content"("content_type_id");

-- CreateIndex
CREATE INDEX "content_release_date_idx" ON "content"("release_date");

-- CreateIndex
CREATE INDEX "content_imdb_id_idx" ON "content"("imdb_id");

-- CreateIndex
CREATE INDEX "content_isbn_idx" ON "content"("isbn");

-- CreateIndex
CREATE INDEX "content_status_idx" ON "content"("status");

-- CreateIndex
CREATE INDEX "content_adult_idx" ON "content"("adult");

-- CreateIndex
CREATE INDEX "content_is_continuing_idx" ON "content"("is_continuing");

-- CreateIndex
CREATE INDEX "content_title_idx" ON "content"("title");

-- CreateIndex
CREATE INDEX "tv_season_tv_show_id_idx" ON "tv_season"("tv_show_id");

-- CreateIndex
CREATE UNIQUE INDEX "tv_season_tv_show_id_season_number_key" ON "tv_season"("tv_show_id", "season_number");

-- CreateIndex
CREATE INDEX "tv_episode_tv_show_id_idx" ON "tv_episode"("tv_show_id");

-- CreateIndex
CREATE INDEX "tv_episode_season_id_idx" ON "tv_episode"("season_id");

-- CreateIndex
CREATE INDEX "tv_episode_season_number_idx" ON "tv_episode"("season_number");

-- CreateIndex
CREATE UNIQUE INDEX "tv_episode_tv_show_id_season_number_episode_number_key" ON "tv_episode"("tv_show_id", "season_number", "episode_number");

-- CreateIndex
CREATE INDEX "user_episode_log_user_id_idx" ON "user_episode_log"("user_id");

-- CreateIndex
CREATE INDEX "user_episode_log_episode_id_idx" ON "user_episode_log"("episode_id");

-- CreateIndex
CREATE INDEX "user_episode_log_watched_idx" ON "user_episode_log"("watched");

-- CreateIndex
CREATE UNIQUE INDEX "user_episode_log_user_id_episode_id_key" ON "user_episode_log"("user_id", "episode_id");

-- CreateIndex
CREATE INDEX "content_genre_content_id_idx" ON "content_genre"("content_id");

-- CreateIndex
CREATE INDEX "content_genre_genre_id_idx" ON "content_genre"("genre_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_genre_content_id_genre_id_key" ON "content_genre"("content_id", "genre_id");

-- CreateIndex
CREATE INDEX "content_person_content_id_idx" ON "content_person"("content_id");

-- CreateIndex
CREATE INDEX "content_person_person_id_idx" ON "content_person"("person_id");

-- CreateIndex
CREATE INDEX "content_person_role_idx" ON "content_person"("role");

-- CreateIndex
CREATE UNIQUE INDEX "content_person_content_id_person_id_role_character_key" ON "content_person"("content_id", "person_id", "role", "character");

-- CreateIndex
CREATE INDEX "content_company_content_id_idx" ON "content_company"("content_id");

-- CreateIndex
CREATE INDEX "content_company_company_id_idx" ON "content_company"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_company_content_id_company_id_role_key" ON "content_company"("content_id", "company_id", "role");

-- CreateIndex
CREATE INDEX "content_country_content_id_idx" ON "content_country"("content_id");

-- CreateIndex
CREATE INDEX "content_country_country_id_idx" ON "content_country"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_country_content_id_country_id_role_key" ON "content_country"("content_id", "country_id", "role");

-- CreateIndex
CREATE INDEX "content_language_content_id_idx" ON "content_language"("content_id");

-- CreateIndex
CREATE INDEX "content_language_language_id_idx" ON "content_language"("language_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_language_content_id_language_id_role_key" ON "content_language"("content_id", "language_id", "role");

-- CreateIndex
CREATE INDEX "content_platform_content_id_idx" ON "content_platform"("content_id");

-- CreateIndex
CREATE INDEX "content_platform_platform_id_idx" ON "content_platform"("platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_platform_content_id_platform_id_key" ON "content_platform"("content_id", "platform_id");

-- CreateIndex
CREATE INDEX "content_image_content_id_idx" ON "content_image"("content_id");

-- CreateIndex
CREATE INDEX "content_image_type_idx" ON "content_image"("type");

-- CreateIndex
CREATE INDEX "content_video_content_id_idx" ON "content_video"("content_id");

-- CreateIndex
CREATE INDEX "content_video_type_idx" ON "content_video"("type");

-- CreateIndex
CREATE INDEX "notification_recipient_user_id_idx" ON "notification"("recipient_user_id");

-- CreateIndex
CREATE INDEX "notification_actor_user_id_idx" ON "notification"("actor_user_id");

-- CreateIndex
CREATE INDEX "review_content_id_idx" ON "review"("content_id");

-- CreateIndex
CREATE INDEX "review_user_id_idx" ON "review"("user_id");

-- CreateIndex
CREATE INDEX "user_content_log_user_id_idx" ON "user_content_log"("user_id");

-- CreateIndex
CREATE INDEX "user_content_log_content_id_idx" ON "user_content_log"("content_id");

-- CreateIndex
CREATE INDEX "user_content_log_date_idx" ON "user_content_log"("date");

-- CreateIndex
CREATE INDEX "user_content_log_user_id_content_id_idx" ON "user_content_log"("user_id", "content_id");

-- CreateIndex
CREATE INDEX "user_content_log_user_id_content_id_date_idx" ON "user_content_log"("user_id", "content_id", "date" DESC);

-- CreateIndex
CREATE INDEX "user_follow_user_id_idx" ON "user_follow"("user_id");

-- CreateIndex
CREATE INDEX "user_follow_following_user_id_idx" ON "user_follow"("following_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follow_user_id_following_user_id_key" ON "user_follow"("user_id", "following_user_id");

-- CreateIndex
CREATE INDEX "review_like_review_id_idx" ON "review_like"("review_id");

-- CreateIndex
CREATE INDEX "review_like_user_id_idx" ON "review_like"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_like_review_id_user_id_key" ON "review_like"("review_id", "user_id");

-- CreateIndex
CREATE INDEX "review_comment_review_id_idx" ON "review_comment"("review_id");

-- CreateIndex
CREATE INDEX "review_comment_user_id_idx" ON "review_comment"("user_id");

-- CreateIndex
CREATE INDEX "review_comment_parent_id_idx" ON "review_comment"("parent_id");

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "content_type_lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_detail" ADD CONSTRAINT "content_detail_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_season" ADD CONSTRAINT "tv_season_tv_show_id_fkey" FOREIGN KEY ("tv_show_id") REFERENCES "content_detail"("content_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_episode" ADD CONSTRAINT "tv_episode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "tv_season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tv_episode" ADD CONSTRAINT "tv_episode_tv_show_id_fkey" FOREIGN KEY ("tv_show_id") REFERENCES "content_detail"("content_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_episode_log" ADD CONSTRAINT "user_episode_log_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "tv_episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_episode_log" ADD CONSTRAINT "user_episode_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_genre" ADD CONSTRAINT "content_genre_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_genre" ADD CONSTRAINT "content_genre_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_person" ADD CONSTRAINT "content_person_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_person" ADD CONSTRAINT "content_person_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_company" ADD CONSTRAINT "content_company_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_company" ADD CONSTRAINT "content_company_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_country" ADD CONSTRAINT "content_country_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_country" ADD CONSTRAINT "content_country_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_language" ADD CONSTRAINT "content_language_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_language" ADD CONSTRAINT "content_language_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_platform" ADD CONSTRAINT "content_platform_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_platform" ADD CONSTRAINT "content_platform_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_image" ADD CONSTRAINT "content_image_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_video" ADD CONSTRAINT "content_video_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_log" ADD CONSTRAINT "user_content_log_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_log" ADD CONSTRAINT "user_content_log_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_content_log" ADD CONSTRAINT "user_content_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_following_user_id_fkey" FOREIGN KEY ("following_user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_like" ADD CONSTRAINT "review_like_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_like" ADD CONSTRAINT "review_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comment" ADD CONSTRAINT "review_comment_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comment" ADD CONSTRAINT "review_comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comment" ADD CONSTRAINT "review_comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "review_comment"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
