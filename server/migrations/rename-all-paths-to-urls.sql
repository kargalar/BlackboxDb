-- Rename all path columns to url columns and fix gender column type
BEGIN;

-- Person table
ALTER TABLE person RENAME COLUMN profile_path TO profile_url;

-- Company table
ALTER TABLE company RENAME COLUMN logo_path TO logo_url;

-- Platform table
ALTER TABLE platform RENAME COLUMN logo_path TO logo_url;

-- TV Season
ALTER TABLE tv_season RENAME COLUMN poster_path TO poster_url;

-- TV Episode
ALTER TABLE tv_episode RENAME COLUMN still_path TO still_url;

-- TV Network (if it exists)
ALTER TABLE tv_network RENAME COLUMN logo_path TO logo_url;

-- App User
ALTER TABLE app_user RENAME COLUMN picture_path TO picture_url;

-- Content Image
ALTER TABLE content_image RENAME COLUMN file_path TO file_url;

-- Convert person.gender from Int to String (nullable)
ALTER TABLE person ADD COLUMN gender_temp VARCHAR(20);
UPDATE person SET gender_temp = CASE 
    WHEN gender = 1 THEN 'female'
    WHEN gender = 2 THEN 'male'
    ELSE 'unknown'
END;
ALTER TABLE person DROP COLUMN gender;
ALTER TABLE person RENAME COLUMN gender_temp TO gender;

COMMIT;
