-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "content_screenshot_content_id_is_enabled_for_quiz_idx" ON "content_screenshot" ("content_id", "is_enabled_for_quiz");
