BEGIN;

INSERT INTO "content_type_lookup" ("name", "slug")
VALUES ('BOARD-GAME', 'board-game')
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "content"
    ADD COLUMN "how_to_play" TEXT,
    ADD COLUMN "min_players" INTEGER,
    ADD COLUMN "max_players" INTEGER,
    ADD CONSTRAINT "content_player_range_check" CHECK (
        ("min_players" IS NULL OR "min_players" > 0)
        AND ("max_players" IS NULL OR "max_players" > 0)
        AND ("min_players" IS NULL OR "max_players" IS NULL OR "min_players" <= "max_players")
    );

COMMIT;
