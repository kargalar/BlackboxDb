-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "content_person_person_id_person_role_id_content_id_idx" ON "content_person" ("person_id", "person_role_id", "content_id");
