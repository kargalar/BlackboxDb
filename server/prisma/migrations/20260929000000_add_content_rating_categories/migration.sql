ALTER TABLE "content"
ADD COLUMN "additional_rating_categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
