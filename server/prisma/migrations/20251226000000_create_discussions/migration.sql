-- CreateTable
CREATE TABLE "discussion" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255),
    "author_id" UUID NOT NULL,
    "is_spoiler" BOOLEAN NOT NULL DEFAULT false,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "downvote_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_comment" (
    "id" SERIAL NOT NULL,
    "discussion_id" INTEGER NOT NULL,
    "author_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "parent_id" INTEGER,
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "downvote_count" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussion_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_vote" (
    "id" SERIAL NOT NULL,
    "discussion_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "vote_type" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_comment_vote" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "vote_type" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_comment_vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discussion_content_id_idx" ON "discussion"("content_id");
CREATE INDEX "discussion_author_id_idx" ON "discussion"("author_id");
CREATE INDEX "discussion_created_at_idx" ON "discussion"("created_at");

-- CreateIndex
CREATE INDEX "discussion_comment_discussion_id_idx" ON "discussion_comment"("discussion_id");
CREATE INDEX "discussion_comment_author_id_idx" ON "discussion_comment"("author_id");
CREATE INDEX "discussion_comment_parent_id_idx" ON "discussion_comment"("parent_id");

-- CreateIndex
CREATE INDEX "discussion_vote_discussion_id_idx" ON "discussion_vote"("discussion_id");
CREATE INDEX "discussion_vote_user_id_idx" ON "discussion_vote"("user_id");
CREATE UNIQUE INDEX "discussion_vote_discussion_id_user_id_key" ON "discussion_vote"("discussion_id", "user_id");

-- CreateIndex
CREATE INDEX "discussion_comment_vote_comment_id_idx" ON "discussion_comment_vote"("comment_id");
CREATE INDEX "discussion_comment_vote_user_id_idx" ON "discussion_comment_vote"("user_id");
CREATE UNIQUE INDEX "discussion_comment_vote_comment_id_user_id_key" ON "discussion_comment_vote"("comment_id", "user_id");

-- AddForeignKey
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion" ADD CONSTRAINT "discussion_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_comment" ADD CONSTRAINT "discussion_comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_comment" ADD CONSTRAINT "discussion_comment_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_comment" ADD CONSTRAINT "discussion_comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "discussion_comment"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "discussion_vote" ADD CONSTRAINT "discussion_vote_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_vote" ADD CONSTRAINT "discussion_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_comment_vote" ADD CONSTRAINT "discussion_comment_vote_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "discussion_comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discussion_comment_vote" ADD CONSTRAINT "discussion_comment_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn to Content
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "discussion_count" INTEGER NOT NULL DEFAULT 0;

-- AddColumn to AppUser (missing preferred_game_platform_id)
ALTER TABLE "app_user" ADD COLUMN IF NOT EXISTS "preferred_game_platform_id" INTEGER;
