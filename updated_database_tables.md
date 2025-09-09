# BlackboxDb Veritabanı Şeması — Güncel

Son Güncelleme: 9 Eylül 2025

Bu doküman `001_initial_schema.sql` içine taşınan tüm migration’ları yansıtır. sql/ klasöründeki tarihli migration dosyaları arşive alınmıştır.

## Ana Tablolar
- app_user (auth_user_id PK, username, email, bio, picture_path, personality_analyze, is_admin, is_moderator, created_at, updated_at)
- content (title, content_type_id FK→content_type_lookup, release_date, description, length, poster_path, consume_count, favorite_count, list_count, review_count, rating_distribution[int[5]], created_at, updated_at)
- review (user_id FK→app_user, content_id FK→content, text, created_at, updated_at)
- user_content_log (user_id, content_id, content_status_id FK, rating, is_favorite, is_consume_later, review_id, date, updated_at)
- review_comment (review_id, user_id, text, created_at)
- review_likes (review_id, user_id, created_at, UNIQUE(review_id,user_id))
- review_replies (review_id, user_id, parent_reply_id self FK, text, created_at, updated_at)
- review_reply_likes (reply_id, user_id, created_at, UNIQUE(reply_id,user_id))
- user_follow (user_id, following_user_id, created_at, UNIQUE(user_id,following_user_id))
- list_movie (user_id, movie_id→content, list_name, added_at, UNIQUE(user_id,movie_id,list_name))

## Lookup Tabloları
- content_type_lookup: 1 MOVIE, 2 GAME, 3 TV, 4 BOOK (upsert ile tohumlandı)
- content_status_lookup: 1 CONSUMED, 2 CONSUMING, 3 UNFINISHED, 4 ABANDONED
- notification_type_lookup: 1 REVIEW_LIKED, 2 FOLLOWED_YOU, 3 CONTENT_APPROVED, 4 CONTENT_REJECTED, 5 COMMENT_REMOVED

## Bildirimler
- notification (recipient_user_id, actor_user_id, type_id, review_id?, reply_id?, created_at, read_at)
- Trigger: review_likes insert → REVIEW_LIKED
- Trigger: user_follow insert → FOLLOWED_YOU

## İçerik Talebi (Content Request)
- content_request_status_lookup: 1 PENDING, 2 APPROVED, 3 REJECTED
- content_request (requester_user_id, title, content_type_id, release_date?, year?, duration_minutes?, description?, poster_path?, external_ids jsonb?, details jsonb?, status_id, admin_user_id?, rejection_reason?, decided_at?, created_at, updated_at)
- RLS: İsteyen kendi kayıtlarını görür/günceller (PENDING iken). Admin/Mod tümünü yönetir.
- RPC: approve_content_request(request_id, admin_id) → content oluşturur, talebi APPROVED yapar, CONTENT_APPROVED bildirimi yollar.
- RPC: reject_content_request(request_id, admin_id, reason) → talebi REJECTED yapar, CONTENT_REJECTED bildirimi yollar.

## View’lar
- latest_user_content_log: kullanıcı–içerik bazında son log’u döner (rating/favorite/status hesapları için kullanılır)

## Toplu İstatistikler
- Function: recompute_content_stats(content_id)
- Trigger’lar: user_content_log INSERT/UPDATE ve review INSERT/DELETE sonrası content istatistikleri güncellenir.

## RLS Politikaları (özet)
- app_user: kullanıcı kendi satırını görür/günceller; privileged kullanıcılar tümünü yönetebilir (view/update/delete)
- user_content_log: kullanıcı kendi loglarını görür/ekler/günceller
- review: herkes okuyabilir; kullanıcı kendi yorumunu yönetir; privileged her yorumu silebilir
- review_comment: herkes okuyabilir; kullanıcı kendi yorumunu ekler
- review_likes: herkes okuyabilir; kullanıcı kendi like’ını ekler/siler
- review_replies: herkes okuyabilir; kullanıcı kendi yanıtını ekler/günceller/siler
- review_reply_likes: development’ta RLS kapalı (ihtiyaca göre açılabilir)
- user_follow: herkes görebilir; kullanıcı kendi follow ilişkisini yönetir
- list_movie: kullanıcı kendi listelerini görür/yonetir
- content: herkes görebilir; privileged yönetebilir
- content_request: isteyen kendi kayıtlarını görür/ekler; privileged tümünü yönetir
- notification/notification_type_lookup: RLS kapalı (salt okuma/insert tetikler için)

## Ek Fonksiyonlar
- is_admin, is_moderator, is_privileged yardımcıları (policy kontrollerinde kullanılır)
- handle_new_user trigger’ı: yeni auth.users kaydında app_user satırı oluşturur (email/username ile)

Not: Eski migration dosyaları sql/ARCHIVE altında tutulur; yeni kurulumlar sadece `001_initial_schema.sql` ile tam şema oluşturur.
