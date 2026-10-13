-- ======================================
-- Reset All Data Except ContentTypeLookup
-- ======================================
-- Bu script veritabanındaki tüm verileri siler
-- SADECE content_type_lookup tablosu korunur
-- Foreign key constraint'ler nedeniyle doğru sırayla silme yapılır

BEGIN;

-- Debug: İşlem öncesi tablo sayılarını göster
DO $$
DECLARE
    table_record RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '=== İŞLEM ÖNCESİ TABLO SAYILARI ===';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('_prisma_migrations')
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.tablename) INTO row_count;
        RAISE NOTICE 'Tablo: % - Kayıt Sayısı: %', table_record.tablename, row_count;
    END LOOP;
END $$;

-- ======================================
-- 1. User Interaction Tables (En dıştaki bağımlılıklar)
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '1. User interaction tables siliniyor...';
END $$;

TRUNCATE TABLE review_comment CASCADE;
TRUNCATE TABLE review_like CASCADE;
TRUNCATE TABLE notification CASCADE;
TRUNCATE TABLE user_follow CASCADE;
TRUNCATE TABLE user_episode_log CASCADE;
TRUNCATE TABLE user_content_log CASCADE;
TRUNCATE TABLE review CASCADE;

DO $$ BEGIN
    RAISE NOTICE '✓ User interaction tables silindi';
END $$;

-- ======================================
-- 2. Content Related Tables (İçerik ilişkileri)
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '2. Content related tables siliniyor...';
END $$;

TRUNCATE TABLE content_video CASCADE;
TRUNCATE TABLE content_image CASCADE;
TRUNCATE TABLE content_platform CASCADE;
TRUNCATE TABLE content_language CASCADE;
TRUNCATE TABLE content_country CASCADE;
TRUNCATE TABLE content_company CASCADE;
TRUNCATE TABLE content_person CASCADE;
TRUNCATE TABLE content_genre CASCADE;

DO $$ BEGIN
    RAISE NOTICE '✓ Content related tables silindi';
END $$;

-- ======================================
-- 3. TV Show Details (Episode, Season, TvDetails)
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '3. TV show details siliniyor...';
END $$;

TRUNCATE TABLE tv_episode CASCADE;
TRUNCATE TABLE tv_season CASCADE;
TRUNCATE TABLE tv_details CASCADE;

DO $$ BEGIN
    RAISE NOTICE '✓ TV show details silindi';
END $$;

-- ======================================
-- 4. Other Content Type Details
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '4. Diğer content type details siliniyor...';
END $$;

TRUNCATE TABLE book_details CASCADE;
TRUNCATE TABLE game_details CASCADE;
TRUNCATE TABLE movie_details CASCADE;

DO $$ BEGIN
    RAISE NOTICE '✓ Content type details silindi';
END $$;

-- ======================================
-- 5. Main Content Table
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '5. Content table siliniyor...';
END $$;

TRUNCATE TABLE content CASCADE;

DO $$ BEGIN
    RAISE NOTICE '✓ Content table silindi';
END $$;

-- ======================================
-- 6. Entity Tables (Person, Company, Genre, etc.)
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '6. Entity tables siliniyor...';
END $$;

TRUNCATE TABLE platform CASCADE;
TRUNCATE TABLE language CASCADE;
TRUNCATE TABLE country CASCADE;
TRUNCATE TABLE genre CASCADE;
TRUNCATE TABLE company CASCADE;
TRUNCATE TABLE person CASCADE;

DO $$ BEGIN
    RAISE NOTICE '✓ Entity tables silindi';
END $$;

-- ======================================
-- 7. User Table
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '7. User table siliniyor...';
END $$;

TRUNCATE TABLE app_user CASCADE;

DO $$ BEGIN
    RAISE NOTICE '✓ User table silindi';
END $$;

-- ======================================
-- 8. ContentTypeLookup KORUNUYOR (SİLİNMİYOR!)
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '8. ContentTypeLookup tablosu korunuyor (silinmiyor)';
END $$;

-- ======================================
-- Reset Sequences
-- ======================================

DO $$ BEGIN
    RAISE NOTICE '9. Sequence''ler sıfırlanıyor...';
END $$;

-- ID sequence'leri sıfırla (content_type_lookup hariç)
ALTER SEQUENCE IF EXISTS person_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS company_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS genre_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS country_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS language_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS platform_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS movie_details_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS tv_season_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS tv_episode_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS content_genre_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS content_person_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS content_company_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS content_country_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS content_language_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS content_platform_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS content_image_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS content_video_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS review_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_content_log_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_episode_log_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_follow_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS notification_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS review_like_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS review_comment_id_seq RESTART WITH 1;

DO $$ BEGIN
    RAISE NOTICE '✓ Sequence''ler sıfırlandı';
END $$;

-- Debug: İşlem sonrası tablo sayılarını göster
DO $$
DECLARE
    table_record RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '=== İŞLEM SONRASI TABLO SAYILARI ===';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('_prisma_migrations')
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.tablename) INTO row_count;
        RAISE NOTICE 'Tablo: % - Kayıt Sayısı: %', table_record.tablename, row_count;
    END LOOP;
END $$;

DO $$ BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VERİTABANI SIFIRLAMA TAMAMLANDI!';
    RAISE NOTICE 'ContentTypeLookup tablosu korundu';
    RAISE NOTICE '===========================================';
END $$;

COMMIT;
