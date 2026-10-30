CREATE TABLE "content_emotion_reaction" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "emotion" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_emotion_reaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_emotion_reaction_emotion_check"
        CHECK ("emotion" IN ('funny', 'scary', 'emotional', 'exciting', 'relaxing', 'thoughtful'))
);

CREATE UNIQUE INDEX "content_emotion_reaction_user_id_content_id_key"
ON "content_emotion_reaction"("user_id", "content_id");

CREATE INDEX "content_emotion_reaction_content_id_emotion_idx"
ON "content_emotion_reaction"("content_id", "emotion");

CREATE INDEX "content_emotion_reaction_emotion_updated_at_idx"
ON "content_emotion_reaction"("emotion", "updated_at" DESC);

ALTER TABLE "content_emotion_reaction"
ADD CONSTRAINT "content_emotion_reaction_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_emotion_reaction"
ADD CONSTRAINT "content_emotion_reaction_content_id_fkey"
FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
