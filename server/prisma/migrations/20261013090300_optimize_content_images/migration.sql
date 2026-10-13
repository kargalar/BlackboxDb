-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "content_image_content_id_type_id_idx" ON "content_image" ("content_id", "type", "id");
