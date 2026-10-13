-- CreateTable
CREATE TABLE "content_edit_history" (
    "id" SERIAL NOT NULL,
    "content_id" VARCHAR(255),
    "actor_user_id" UUID,
    "action" VARCHAR(20) NOT NULL,
    "summary" TEXT,
    "changed_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_edit_history_content_id_idx" ON "content_edit_history"("content_id");

-- CreateIndex
CREATE INDEX "content_edit_history_actor_user_id_idx" ON "content_edit_history"("actor_user_id");

-- CreateIndex
CREATE INDEX "content_edit_history_action_idx" ON "content_edit_history"("action");

-- CreateIndex
CREATE INDEX "content_edit_history_created_at_idx" ON "content_edit_history"("created_at");

-- AddForeignKey
ALTER TABLE "content_edit_history" ADD CONSTRAINT "content_edit_history_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_edit_history" ADD CONSTRAINT "content_edit_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("auth_user_id") ON DELETE SET NULL ON UPDATE CASCADE;
