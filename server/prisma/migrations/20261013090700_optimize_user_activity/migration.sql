-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "user_content_log_user_id_date_updated_at_id_idx" ON "user_content_log" ("user_id", "date" DESC, "updated_at" DESC, "id" DESC);
