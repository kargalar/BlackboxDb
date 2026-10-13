ALTER TABLE "user_content_log"
ADD COLUMN IF NOT EXISTS "notify_on_release" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "user_content_log_notify_on_release_idx"
ON "user_content_log"("notify_on_release");
