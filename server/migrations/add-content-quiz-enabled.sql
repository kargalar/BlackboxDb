-- Add isEnabledForQuiz field to Content model
-- This field controls whether a content can appear in quizzes

ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "is_enabled_for_quiz" BOOLEAN NOT NULL DEFAULT true;

-- Create index for faster quiz queries
CREATE INDEX IF NOT EXISTS "content_is_enabled_for_quiz_idx" ON "content"("is_enabled_for_quiz");
