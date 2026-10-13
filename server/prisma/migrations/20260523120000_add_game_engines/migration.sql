CREATE TABLE IF NOT EXISTS "game_engine" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL UNIQUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "content_game_engine" (
    "id" SERIAL PRIMARY KEY,
    "content_id" VARCHAR(255) NOT NULL,
    "game_engine_id" INTEGER NOT NULL,
    CONSTRAINT "content_game_engine_content_id_fkey"
        FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "content_game_engine_game_engine_id_fkey"
        FOREIGN KEY ("game_engine_id") REFERENCES "game_engine"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "content_game_engine_content_id_game_engine_id_key"
    ON "content_game_engine"("content_id", "game_engine_id");

CREATE INDEX IF NOT EXISTS "content_game_engine_content_id_idx"
    ON "content_game_engine"("content_id");

CREATE INDEX IF NOT EXISTS "content_game_engine_game_engine_id_idx"
    ON "content_game_engine"("game_engine_id");
