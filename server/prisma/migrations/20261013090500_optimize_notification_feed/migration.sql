-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "notification_recipient_user_id_created_at_id_idx" ON "notification" ("recipient_user_id", "created_at" DESC, "id" DESC);
