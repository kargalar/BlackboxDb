ALTER TABLE "content"
  ADD COLUMN "explicit" BOOLEAN,
  ADD COLUMN "label" VARCHAR(255),
  ADD COLUMN "total_tracks" INTEGER;
