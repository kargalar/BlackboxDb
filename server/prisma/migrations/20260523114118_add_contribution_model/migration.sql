-- AlterTable
ALTER TABLE "app_user" ADD COLUMN     "contribution_score" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "contribution" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "content_id" VARCHAR(255),
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contribution_user_id_idx" ON "contribution"("user_id");

-- CreateIndex
CREATE INDEX "contribution_content_id_idx" ON "contribution"("content_id");

-- CreateIndex
CREATE INDEX "contribution_status_idx" ON "contribution"("status");

-- AddForeignKey
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("auth_user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "app_user"("auth_user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
