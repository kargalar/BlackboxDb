-- Migration: Convert franchise.id from Int to UUID
-- This will recreate the franchise table with UUID primary key

-- 1. Drop foreign key constraint from content table
ALTER TABLE "content" DROP CONSTRAINT IF EXISTS "content_franchise_id_fkey";

-- 2. Create temporary backup of franchise data
CREATE TABLE franchise_backup AS SELECT * FROM franchise;

-- 3. Drop franchise table
DROP TABLE franchise CASCADE;

-- 4. Create new franchise table with UUID id
CREATE TABLE franchise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Migrate data with new UUIDs
INSERT INTO franchise (name, slug, description, created_at, updated_at)
SELECT name, slug, description, created_at, updated_at
FROM franchise_backup;

-- 6. Update content.franchise_id column to UUID
ALTER TABLE content ALTER COLUMN franchise_id TYPE UUID USING NULL;

-- 7. Re-add foreign key constraint
ALTER TABLE content ADD CONSTRAINT content_franchise_id_fkey FOREIGN KEY (franchise_id) REFERENCES franchise(id) ON DELETE SET NULL;

-- 8. Create index
CREATE INDEX IF NOT EXISTS "content_franchise_id_idx" ON "content"("franchise_id");

-- 9. Drop backup table
DROP TABLE franchise_backup;

