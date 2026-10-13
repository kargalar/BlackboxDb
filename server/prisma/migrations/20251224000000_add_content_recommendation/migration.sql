-- CreateTable
CREATE TABLE "content_recommendation" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255) NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "recommender_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thanked_at" TIMESTAMP(3),

    CONSTRAINT "content_recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_recommendation_recipient_user_id_idx" ON "content_recommendation"("recipient_user_id");

-- CreateIndex
CREATE INDEX "content_recommendation_recommender_user_id_idx" ON "content_recommendation"("recommender_user_id");

-- CreateIndex
CREATE INDEX "content_recommendation_content_id_idx" ON "content_recommendation"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_recommendation_content_id_recipient_user_id_recommender_user_id_key" ON "content_recommendation"("content_id", "recipient_user_id", "recommender_user_id");

-- AddForeignKey
ALTER TABLE "content_recommendation" ADD CONSTRAINT "content_recommendation_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_recommendation" ADD CONSTRAINT "content_recommendation_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_recommendation" ADD CONSTRAINT "content_recommendation_recommender_user_id_fkey" FOREIGN KEY ("recommender_user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;
