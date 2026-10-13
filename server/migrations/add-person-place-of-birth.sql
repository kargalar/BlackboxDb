-- ============================================
-- ADD PLACE_OF_BIRTH TO PERSON TABLE
-- ============================================
-- Tarih: 2025-10-12
-- Amaç: Person tablosuna doğum yeri alanı ekle
-- ============================================

BEGIN;

-- Person tablosuna place_of_birth alanı ekle
ALTER TABLE "person" 
ADD COLUMN IF NOT EXISTS "place_of_birth" VARCHAR(255);

-- Index ekle (doğum yerine göre arama için)
CREATE INDEX IF NOT EXISTS "idx_person_place_of_birth" 
ON "person"("place_of_birth");

COMMIT;

-- Güncelleme sonrası kontrol
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'person'
AND column_name = 'place_of_birth';
