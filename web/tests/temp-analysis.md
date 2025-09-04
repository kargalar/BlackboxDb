🔍 Comprehensive database schema extraction...
✅ Signed in for comprehensive extraction
📋 Testing 38 potential tables...

🔍 Testing table: app_user
  ✅ app_user: 1 rows, 8 columns

🔍 Testing table: content
  ✅ content: 31 rows, 14 columns

🔍 Testing table: user_content_log
  ✅ user_content_log: 0 rows, 0 columns

🔍 Testing table: review
  ✅ review: 7 rows, 6 columns

🔍 Testing table: review_reply
  ❌ review_reply: Table does not exist

🔍 Testing table: content_type
  ❌ content_type: Table does not exist

🔍 Testing table: content_status
  ❌ content_status: Table does not exist

🔍 Testing table: showcase_content
  ❌ showcase_content: Table does not exist

🔍 Testing table: g_genre
  ✅ g_genre: 0 rows, 0 columns

🔍 Testing table: g_platform
  ✅ g_platform: 0 rows, 0 columns

🔍 Testing table: genre
  ❌ genre: Table does not exist

🔍 Testing table: platform
  ❌ platform: Table does not exist

🔍 Testing table: x_game_platform
  ✅ x_game_platform: 0 rows, 0 columns

🔍 Testing table: x_content_genre
  ❌ x_content_genre: Table does not exist

🔍 Testing table: x_user_genre
  ❌ x_user_genre: Table does not exist

🔍 Testing table: user_follow
  ✅ user_follow: 0 rows, 0 columns

🔍 Testing table: user_review
  ❌ user_review: Table does not exist

🔍 Testing table: user_preference
  ❌ user_preference: Table does not exist

🔍 Testing table: user_notification
  ❌ user_notification: Table does not exist

🔍 Testing table: user_session
  ❌ user_session: Table does not exist

🔍 Testing table: user_activity
  ❌ user_activity: Table does not exist

🔍 Testing table: latest_user_content_log
  ✅ latest_user_content_log: 21 rows, 10 columns

🔍 Testing table: friend_activity
  ❌ friend_activity: Table does not exist

🔍 Testing table: user_stats
  ❌ user_stats: Table does not exist

🔍 Testing table: content_stats
  ❌ content_stats: Table does not exist

🔍 Testing table: trending_content
  ❌ trending_content: Table does not exist

🔍 Testing table: language
  ❌ language: Table does not exist

🔍 Testing table: country
  ❌ country: Table does not exist

🔍 Testing table: rating_system
  ❌ rating_system: Table does not exist

🔍 Testing table: migration
  ❌ migration: Table does not exist

🔍 Testing table: system_config
  ❌ system_config: Table does not exist

🔍 Testing table: api_keys
  ❌ api_keys: Table does not exist

🔍 Testing table: users
  ❌ users: Table does not exist

🔍 Testing table: sessions
  ❌ sessions: Table does not exist

🔍 Testing table: refresh_tokens
  ❌ refresh_tokens: Table does not exist

🔍 Testing table: tmdb_cache
  ❌ tmdb_cache: Table does not exist

🔍 Testing table: igdb_cache
  ❌ igdb_cache: Table does not exist

🔍 Testing table: external_content_mapping
  ❌ external_content_mapping: Table does not exist

📋 Testing RPC functions comprehensively...

🔧 Testing RPC: get_user_contents
  ✅ get_user_contents: Working perfectly

🔧 Testing RPC: get_content_detail
  ✅ get_content_detail: Working perfectly

🔧 Testing RPC: search_content
  📊 search_content: exists_with_error - column "c.created_at" must appear in the GROUP BY clause or be used in an aggregate function

🔧 Testing RPC: get_trend_contents
  ✅ get_trend_contents: Working perfectly

🔧 Testing RPC: get_recommended_contents
  📊 get_recommended_contents: exists_with_error - column "c.favorite_count" must appear in the GROUP BY clause or be used in an aggregate function

🔧 Testing RPC: get_friend_activities
  ✅ get_friend_activities: Working perfectly

🔧 Testing RPC: get_user_info_with_stats
  ✅ get_user_info_with_stats: Working perfectly

🔧 Testing RPC: recompute_content_stats
  ✅ recompute_content_stats: Working perfectly

🔧 Testing RPC: create_user_content_log
  📊 create_user_content_log: exists_wrong_params - Function exists but with different parameters

🔧 Testing RPC: get_user_statistics
  📊 get_user_statistics: exists_wrong_params - Function exists but with different parameters

🔧 Testing RPC: search_users
  📊 search_users: exists_wrong_params - Function exists but with different parameters

🔧 Testing RPC: get_content_recommendations
  📊 get_content_recommendations: exists_wrong_params - Function exists but with different parameters
Schema extraction: 28.220s

📝 Generating comprehensive documentation...
# BlackboxDb Veritabanı Şeması (Kapsamlı Analiz)

*Son Güncelleme: 04.09.2025 15:55:09*  
*Kaynak: Canlı Supabase Veritabanı - Kapsamlı Analiz*

## 📊 Veritabanı Özeti

- **Toplam Mevcut Tablo**: 9
- **Tam Erişilebilir Tablo**: 9
- **Kısıtlı Erişim Tablosu**: 0
- **RPC Fonksiyonu**: 12

## 📋 Tablo Listesi

### ✅ Tam Erişilebilir Tablolar

| Tablo Adı | Satır Sayısı | Kolon Sayısı | Açıklama |
|-----------|--------------|--------------|----------|
| `app_user` | 1 | 8 | Uygulama kullanıcı profilleri (Supabase auth ile entegre) |
| `content` | 31 | 14 | Film ve oyun içerik ana tablosu (TMDB/IGDB verileri) |
| `user_content_log` | 0 | 0 | Kullanıcı-içerik etkileşim logları (izleme, rating, favori) |
| `review` | 7 | 6 | Kullanıcı yorumları ve değerlendirmeleri |
| `g_genre` | 0 | 0 | Oyun türleri master tablosu |
| `g_platform` | 0 | 0 | Oyun platformları master tablosu |
| `x_game_platform` | 0 | 0 | Oyun-platform ilişki tablosu |
| `user_follow` | 0 | 0 | Kullanıcı takip ilişkileri |
| `latest_user_content_log` | 21 | 10 | Kullanıcıların son içerik aktiviteleri (view) |

## 📊 Tablo Detayları

### app_user

**Açıklama**: Uygulama kullanıcı profilleri (Supabase auth ile entegre)  
**Satır Sayısı**: 1  
**Kolon Sayısı**: 8

| Kolon | Tip | Örnek Değer | Açıklama |
|-------|-----|-------------|----------|
| `auth_user_id` | uuid | "283d293a-1802-49bf-a4dc-be80043a6337" | Supabase auth user referansı |
| `picture_path` | nullable | NULL |  |
| `username` | varchar | "webuser1756989305476" |  |
| `email` | email (text) | "webtest_1756989305476@example.com" |  |
| `bio` | nullable | NULL |  |
| `personality_analyze` | nullable | NULL |  |
| `created_at` | timestamp with time zone | "2025-09-04T12:35:07.199611+00:00" | Oluşturulma zamanı |
| `updated_at` | timestamp with time zone | "2025-09-04T12:35:07.199611+00:00" | Son güncellenme zamanı |

### content

**Açıklama**: Film ve oyun içerik ana tablosu (TMDB/IGDB verileri)  
**Satır Sayısı**: 31  
**Kolon Sayısı**: 14

| Kolon | Tip | Örnek Değer | Açıklama |
|-------|-----|-------------|----------|
| `id` | integer | 757019 | Primary key |
| `title` | varchar | "Fight" |  |
| `content_type_id` | integer | 1 |  |
| `release_date` | date | "1973-01-01" |  |
| `description` | varchar | "An improvised hour-long fight between Brigid Be..." |  |
| `length` | integer | 50 |  |
| `poster_path` | url/path (text) | "/sKLsn8KckO0uP1jaQR7jsmGdkNj.jpg" |  |
| `consume_count` | integer | 0 |  |
| `favorite_count` | integer | 0 |  |
| `list_count` | integer | 0 |  |
| `review_count` | integer | 0 |  |
| `rating_distribution` | integer[] | [5 items] |  |
| `created_at` | timestamp with time zone | "2025-08-08T08:30:25.302451+00:00" | Oluşturulma zamanı |
| `updated_at` | timestamp with time zone | "2025-08-08T08:30:25.302451+00:00" | Son güncellenme zamanı |

### user_content_log

**Açıklama**: Kullanıcı-içerik etkileşim logları (izleme, rating, favori)  
**Satır Sayısı**: 0  
**Kolon Sayısı**: 0

### review

**Açıklama**: Kullanıcı yorumları ve değerlendirmeleri  
**Satır Sayısı**: 7  
**Kolon Sayısı**: 6

| Kolon | Tip | Örnek Değer | Açıklama |
|-------|-----|-------------|----------|
| `id` | integer | 1 | Primary key |
| `user_id` | uuid | "425e4c7c-51cc-4675-b741-597219c3f35e" | Kullanıcı referansı |
| `content_id` | integer | 980477 | İçerik referansı |
| `text` | varchar | "dawd" |  |
| `created_at` | timestamp with time zone | "2025-09-02T05:02:06.919775+00:00" | Oluşturulma zamanı |
| `updated_at` | timestamp with time zone | "2025-09-02T05:02:06.919775+00:00" | Son güncellenme zamanı |

### g_genre

**Açıklama**: Oyun türleri master tablosu  
**Satır Sayısı**: 0  
**Kolon Sayısı**: 0

### g_platform

**Açıklama**: Oyun platformları master tablosu  
**Satır Sayısı**: 0  
**Kolon Sayısı**: 0

### x_game_platform

**Açıklama**: Oyun-platform ilişki tablosu  
**Satır Sayısı**: 0  
**Kolon Sayısı**: 0

### user_follow

**Açıklama**: Kullanıcı takip ilişkileri  
**Satır Sayısı**: 0  
**Kolon Sayısı**: 0

### latest_user_content_log

**Açıklama**: Kullanıcıların son içerik aktiviteleri (view)  
**Satır Sayısı**: 21  
**Kolon Sayısı**: 10

| Kolon | Tip | Örnek Değer | Açıklama |
|-------|-----|-------------|----------|
| `id` | integer | 101 | Primary key |
| `user_id` | uuid | "425e4c7c-51cc-4675-b741-597219c3f35e" | Kullanıcı referansı |
| `content_id` | integer | 11631 | İçerik referansı |
| `content_status_id` | integer | 1 |  |
| `rating` | numeric/decimal | 4.5 |  |
| `is_favorite` | boolean | false |  |
| `is_consume_later` | boolean | false |  |
| `review_id` | nullable | NULL |  |
| `date` | timestamp with time zone | "2025-09-02T19:31:23.355224+00:00" |  |
| `updated_at` | timestamp with time zone | "2025-09-02T19:31:23.355224+00:00" | Son güncellenme zamanı |

## 🔧 RPC Fonksiyonları

### ✅ Çalışan Fonksiyonlar (6)

| Fonksiyon | Açıklama | Test Sonucu |
|-----------|----------|-------------|
| `get_user_contents` | Kullanıcının içerik listesini getirir (sayfalama ile) | object |
| `get_content_detail` | Belirli bir içeriğin detay bilgilerini getirir | null |
| `get_trend_contents` | Popüler/trend içerikleri listeler | Array(20) |
| `get_friend_activities` | Takip edilen kullanıcıların aktivitelerini listeler | Array(0) |
| `get_user_info_with_stats` | Kullanıcı profili ve istatistiklerini getirir | Array(0) |
| `recompute_content_stats` | İçerik istatistiklerini yeniden hesaplar | null |

### ⚠️ Mevcut Ancak Sorunlu Fonksiyonlar (6)

| Fonksiyon | Durum | Hata Detayı | Açıklama |
|-----------|-------|-------------|----------|
| `search_content` | exists_with_error | column "c.created_at" must appear in the GROUP BY clause or be used in an aggregate function | İçerik arama işlemi yapar |
| `get_recommended_contents` | exists_with_error | column "c.favorite_count" must appear in the GROUP BY clause or be used in an aggregate function | Kullanıcıya önerilen içerikleri getirir |
| `create_user_content_log` | exists_wrong_params | Could not find the function public.create_user_content_log(content_id, status, user_id) in the schema cache | Yeni kullanıcı-içerik log kaydı oluşturur |
| `get_user_statistics` | exists_wrong_params | Could not find the function public.get_user_statistics(user_id) in the schema cache | Kullanıcı istatistiklerini getirir |
| `search_users` | exists_wrong_params | Could not find the function public.search_users(limit_param, query) in the schema cache | Kullanıcı arama işlemi yapar |
| `get_content_recommendations` | exists_wrong_params | Could not find the function public.get_content_recommendations(limit_param, user_id) in the schema cache | İçerik önerilerini getirir |

## 📝 Teknik Notlar

### Erişim Kontrolleri
- RLS (Row Level Security) politikaları aktif
- Authenticated kullanıcılar kendi verilerine erişebiliyor
- Anonymous erişim çoğu tablo için kısıtlı

### Veri Tipleri
- UUID'ler Supabase auth ile uyumlu
- Timestamp'ler timezone bilgisiyle saklanıyor
- JSON/JSONB alanlar kompleks veri için kullanılıyor

### İlişkiler
- `app_user.auth_user_id` → Supabase auth.users
- `content.id` → TMDB/IGDB external IDs
- `user_content_log` → Many-to-many user-content relations

---

*Bu dokümantasyon otomatik olarak generate edilmiştir.*


🔧 Raw schema data saved to schema-data.json
