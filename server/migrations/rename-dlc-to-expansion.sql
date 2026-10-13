-- Migration: Rename type value 'dlc' → 'expansion' in expansion table
-- Date: 2025-01-XX
-- Description: DLC type değerini expansion olarak değiştir

-- 1. Mevcut 'dlc' type değerlerini 'expansion' olarak güncelle
UPDATE expansion SET type = 'expansion' WHERE type = 'dlc';

-- 2. Default değeri 'expansion' olarak değiştir
ALTER TABLE expansion ALTER COLUMN type SET DEFAULT 'expansion';

-- Verify
SELECT type, COUNT(*) FROM expansion GROUP BY type;
