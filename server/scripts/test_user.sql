-- Test kullanıcısı ekle veya güncelle
UPDATE app_user 
SET password_hash = '$2a$10$7fVNiDzk6yjI4xn5L.QmP.KmrdpfjH4k0vtxzjUiobrme6i4bDe0e' 
WHERE email = 'm.islam0422@gmail.com';

-- Kullanıcı yoksa ekle
INSERT INTO app_user (auth_user_id, username, email, password_hash, created_at, updated_at)
SELECT gen_random_uuid(), 'testuser', 'm.islam0422@gmail.com', '$2a$10$7fVNiDzk6yjI4xn5L.QmP.KmrdpfjH4k0vtxzjUiobrme6i4bDe0e', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = 'm.islam0422@gmail.com');

-- Sonuç kontrol
SELECT email, username, password_hash FROM app_user WHERE email = 'm.islam0422@gmail.com';
