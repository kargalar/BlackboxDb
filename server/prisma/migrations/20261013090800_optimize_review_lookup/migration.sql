-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "discussion_author_id_content_id_type_is_deleted_created_at_id_idx" ON "discussion" ("author_id", "content_id", "type", "is_deleted", "created_at", "id");
