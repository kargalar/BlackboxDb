-- AlterTable: Transition platform table
ALTER TABLE "platform" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(100);
ALTER TABLE "platform" DROP COLUMN IF EXISTS "platform_type";
ALTER TABLE "platform" DROP COLUMN IF EXISTS "logo_url";
ALTER TABLE "platform" DROP COLUMN IF EXISTS "website";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "platform_slug_key" ON "platform"("slug");

-- AlterTable: Transition content_platform table
ALTER TABLE "content_platform" DROP COLUMN IF EXISTS "availability";
ALTER TABLE "content_platform" ADD COLUMN IF NOT EXISTS "release_date" DATE;
ALTER TABLE "content_platform" ADD COLUMN IF NOT EXISTS "link" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_platform_content_id_idx" ON "content_platform"("content_id");
CREATE INDEX IF NOT EXISTS "content_platform_platform_id_idx" ON "content_platform"("platform_id");
CREATE UNIQUE INDEX IF NOT EXISTS "content_platform_content_id_platform_id_key" ON "content_platform"("content_id", "platform_id");

-- AddForeignKey
ALTER TABLE "content_platform" DROP CONSTRAINT IF EXISTS "content_platform_content_id_fkey";
ALTER TABLE "content_platform" ADD CONSTRAINT "content_platform_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_platform" DROP CONSTRAINT IF EXISTS "content_platform_platform_id_fkey";
ALTER TABLE "content_platform" ADD CONSTRAINT "content_platform_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default platforms
INSERT INTO "platform" ("name", "slug") VALUES
    ('Windows', 'windows'),
    ('PlayStation 5', 'ps5'),
    ('PlayStation 4', 'ps4'),
    ('PlayStation 3', 'ps3'),
    ('PlayStation 2', 'ps2'),
    ('PlayStation', 'ps1'),
    ('Xbox Series X/S', 'xbox-series'),
    ('Xbox One', 'xbox-one'),
    ('Xbox 360', 'xbox-360'),
    ('Nintendo Switch', 'switch'),
    ('Nintendo 3DS', '3ds'),
    ('Nintendo Wii U', 'wii-u'),
    ('Nintendo Wii', 'wii'),
    ('Steam Deck', 'steam-deck'),
    ('macOS', 'macos'),
    ('Linux', 'linux'),
    ('iOS', 'ios'),
    ('Android', 'android'),
    ('Web Browser', 'web'),
    ('VR', 'vr')
ON CONFLICT DO NOTHING;
