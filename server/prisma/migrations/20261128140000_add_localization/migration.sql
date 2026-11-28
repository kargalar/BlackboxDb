BEGIN;

ALTER TABLE "app_user" ADD COLUMN "show_original_titles" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "catalog_translation" (
  "catalog" VARCHAR(30) NOT NULL,
  "entry_id" INTEGER NOT NULL,
  "language" VARCHAR(5) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  PRIMARY KEY ("catalog", "entry_id", "language")
);

CREATE INDEX "content_translation_title_trgm_idx"
  ON "content_translation" USING GIN ("title" gin_trgm_ops);

COMMIT;
