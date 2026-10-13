-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "person_is_pending_name_id_idx" ON "person" ("is_pending", "name", "id");
