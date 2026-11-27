BEGIN;

ALTER TABLE "expansion" ADD COLUMN "detail_content_id" VARCHAR(255);
CREATE UNIQUE INDEX "expansion_detail_content_id_key" ON "expansion" ("detail_content_id");
ALTER TABLE "expansion"
  ADD CONSTRAINT "expansion_detail_content_id_fkey"
  FOREIGN KEY ("detail_content_id") REFERENCES "content" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "expansion_distinct_detail_check"
  CHECK ("detail_content_id" IS NULL OR "detail_content_id" <> "content_id");

-- Attach the previously imported catalog entries while retaining their details and activity.
WITH board_game_packages (parent_id, detail_id, package_type) AS (
  VALUES
    ('die-siedler-von-catan', 'catan-das-spiel-erweiterung-fur-5-6-personen', 'expansion'),
    ('die-siedler-von-catan', 'catan-seefahrer', 'expansion'),
    ('die-siedler-von-catan', 'catan-stadte-ritter', 'expansion'),
    ('die-siedler-von-catan', 'catan-handler-barbaren', 'expansion'),
    ('die-siedler-von-catan', 'catan-entdecker-piraten', 'expansion'),
    ('die-siedler-von-catan', 'catan-3d-edition', 'remake'),
    ('die-siedler-von-catan', 'catan-das-duell', 'remake'),
    ('die-siedler-von-catan', 'catan-energien', 'remake'),
    ('die-siedler-von-catan', 'catan-junior', 'remake'),
    ('catan-seefahrer', 'catan-seefahrer-erweiterung-fur-5-6-personen', 'expansion'),
    ('catan-stadte-ritter', 'catan-stadte-ritter-erweiterung-fur-5-6-personen', 'expansion'),
    ('catan-handler-barbaren', 'catan-handler-barbaren-erweiterung-fur-5-6-personen', 'expansion'),
    ('catan-entdecker-piraten', 'catan-entdecker-piraten-erweiterung-fur-5-6-personen', 'expansion'),
    ('flip-7', 'flip-7-with-a-vengeance', 'remake'),
    ('monopoly', 'monopoly-buy-everything', 'expansion'),
    ('monopoly', 'monopoly-free-parking-jackpot', 'expansion'),
    ('monopoly', 'monopoly-cheaters-edition', 'remake'),
    ('monopoly', 'monopoly-deal', 'remake'),
    ('monopoly', 'monopoly-junior', 'remake'),
    ('monopoly', 'monopoly-ultimate-banking-edition', 'remake'),
    ('exploding-kittens-original-edition', 'barking-kittens', 'expansion'),
    ('exploding-kittens-original-edition', 'imploding-kittens', 'expansion'),
    ('exploding-kittens-original-edition', 'streaking-kittens', 'expansion'),
    ('exploding-kittens-original-edition', 'exploding-kittens-2-player-edition', 'remake'),
    ('exploding-kittens-original-edition', 'exploding-kittens-cat-burglar-edition', 'remake'),
    ('exploding-kittens-original-edition', 'exploding-kittens-good-vs-evil', 'remake'),
    ('exploding-kittens-original-edition', 'exploding-kittens-nsfw-edition', 'remake'),
    ('exploding-kittens-original-edition', 'exploding-kittens-party-pack-edition', 'remake'),
    ('exploding-kittens-original-edition', 'exploding-kittens-recipes-for-disaster', 'remake'),
    ('exploding-kittens-original-edition', 'exploding-kittens-the-board-game', 'remake'),
    ('exploding-kittens-original-edition', 'zombie-kittens', 'remake'),
    ('uno', 'uno-all-wild', 'remake'),
    ('uno', 'uno-flip', 'remake'),
    ('uno', 'uno-show-em-no-mercy', 'remake'),
    ('uno', 'uno-teams', 'remake'),
    ('uno-show-em-no-mercy', 'uno-show-em-no-mercy-expansion-pack', 'expansion'),
    ('iskambil', 'gin-rummy', 'remake'),
    ('iskambil', 'hearts', 'remake'),
    ('iskambil', 'spades', 'remake'),
    ('iskambil', 'texas-holdem', 'remake'),
    ('dungeons-and-dragons', 'dungeons-and-dragons-5-5e-2024', 'remake'),
    ('dungeons-and-dragons', 'dungeons-and-dragons-5e-2014', 'remake'),
    ('dungeons-and-dragons', 'dungeons-and-dragons-dragons-of-stormwreck-isle', 'remake'),
    ('dungeons-and-dragons', 'dungeons-and-dragons-essentials-kit', 'remake'),
    ('dungeons-and-dragons', 'dungeons-and-dragons-heroes-of-the-borderlands', 'remake')
)
INSERT INTO "expansion" (
  "content_id", "detail_content_id", "name", "description", "poster_url", "release_date", "type", "updated_at"
)
SELECT parent."id", detail."id", detail."title", detail."description",
       poster."file_url", detail."release_date", packages.package_type, CURRENT_TIMESTAMP
FROM board_game_packages packages
JOIN "content" parent ON parent."id" = packages.parent_id
JOIN "content_type_lookup" media ON media."id" = parent."content_type_id" AND media."slug" = 'board-game'
JOIN "content" detail ON detail."id" = packages.detail_id
  AND detail."content_type_id" = media."id"
  AND detail."franchise_id" = parent."franchise_id"
LEFT JOIN "content_image" poster ON poster."id" = detail."poster_image_id"
WHERE NOT parent."is_deleted" AND NOT detail."is_deleted"
ON CONFLICT ("detail_content_id") DO NOTHING;

COMMIT;
