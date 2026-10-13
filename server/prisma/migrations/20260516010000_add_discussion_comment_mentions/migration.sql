CREATE TABLE "discussion_comment_mention" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "mentioned_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_comment_mention_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discussion_comment_mention_comment_id_mentioned_user_id_key"
ON "discussion_comment_mention"("comment_id", "mentioned_user_id");

CREATE INDEX "discussion_comment_mention_comment_id_idx"
ON "discussion_comment_mention"("comment_id");

CREATE INDEX "discussion_comment_mention_mentioned_user_id_idx"
ON "discussion_comment_mention"("mentioned_user_id");

ALTER TABLE "discussion_comment_mention"
ADD CONSTRAINT "discussion_comment_mention_comment_id_fkey"
FOREIGN KEY ("comment_id") REFERENCES "discussion_comment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discussion_comment_mention"
ADD CONSTRAINT "discussion_comment_mention_mentioned_user_id_fkey"
FOREIGN KEY ("mentioned_user_id") REFERENCES "app_user"("auth_user_id")
ON DELETE CASCADE ON UPDATE CASCADE;
