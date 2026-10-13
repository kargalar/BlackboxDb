-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "notification_recipient_user_id_read_at_idx" ON "notification" ("recipient_user_id", "read_at");
