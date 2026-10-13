-- One concurrent index per migration: PostgreSQL forbids concurrent builds in a transaction block.
CREATE INDEX CONCURRENTLY "person_name_trgm_idx" ON "person" USING GIN ("name" gin_trgm_ops);
