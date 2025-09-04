# BlackboxDb Veritabanı Şeması (Eksiksiz Analiz - Screenshot Bazlı)

*Son Güncelleme: 4 Eylül 2025, 16:15*  
*Kaynak: Canlı Supabase Veritabanı + Screenshot Analizi*

## 📊 Veritabanı Özeti

- **Toplam Mevcut Tablo**: 8
- **Tam Erişilebilir Tablo**: 8  
- **Aktif RPC Fonksiyonu**: 12 (Screenshot Doğrulamalı)
- **Database Trigger**: 4
- **Kısıtlı Erişim Tablosu**: 0

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

### 📊 Views (Database Views)

| View Adı | Satır Sayısı | Kolon Sayısı | Açıklama |
|----------|--------------|--------------|----------|
| `latest_user_content_log` | 21 | 10 | Kullanıcıların son içerik aktiviteleri |

## 🔧 RPC Fonksiyonları (Screenshot Doğrulamalı)

### ✅ Çalışan Fonksiyonlar

| Fonksiyon Adı | Parametreler | Durum | Açıklama |
|---------------|--------------|-------|----------|
| `get_friend_activities` | `content_type_param integer, user_id_param` | ✅ Çalışıyor | Arkadaş aktivitelerini getirir |
| `get_top_reviews` | `content_type_param integer DEFAULT` | ✅ Çalışıyor | En iyi yorumları getirir |
| `get_trend_contents` | `content_type_param integer, user_id_param` | ✅ Çalışıyor | Trend içerikleri (20 sonuç) |
| `get_user_info_with_stats` | `user_uuid uuid, profile_user_uuid uuid` | ✅ Çalışıyor | Kullanıcı bilgi + istatistikleri |
| `handle_new_user` | - | ✅ Çalışıyor | Yeni kullanıcı işlemleri (16 sonuç) |
| `recompute_content_stats` | `content_id_param integer` | ✅ Çalışıyor | İçerik istatistiklerini yeniden hesaplar |

### ❌ Hatalı/Eksik Fonksiyonlar

| Fonksiyon Adı | Parametreler | Hata | Açıklama |
|---------------|--------------|------|----------|
| `search_content` | `query_text, content_type_param` | Function not found | İçerik arama fonksiyonu eksik |
| `get_content_detail` | `content_id_param integer, content_type_param` | Function not found | İçerik detay fonksiyonu eksik |
| `get_most_watched_movies` | `page_param integer, limit_param integer` | Function not found | En çok izlenen filmler eksik |
| `get_recommended_contents` | `user_id_param uuid, content_type_param` | SQL GROUP BY error | SQL hatası var |
| `get_top_actors_by_movie_count` | `page_param integer, limit_param integer` | Function not found | Top aktörler fonksiyonu eksik |
| `get_user_contents` | `user_id_param uuid, log_user_id_param` | Function not found | Kullanıcı içerikleri eksik |

## 🔄 Database Triggers (Screenshot Analizi)

| Trigger Adı | Tür | Açıklama |
|-------------|-----|----------|
| `trg_after_review_change` | Trigger | Review tablosu değişikliklerinden sonra tetiklenir |
| `trg_after_user_content_log_update` | Trigger | user_content_log güncellemelerinden sonra tetiklenir |
| `update_review_replies_updated_at` | Function | Review cevaplarının zaman damgasını günceller |
| `update_updated_at_column` | Function | updated_at kolonunu otomatik günceller |

## 📊 Tablo Detayları

### app_user

**Açıklama**: Uygulama kullanıcı profilleri (Supabase auth ile entegre)  
**Satır Sayısı**: 1  
**Kolon Sayısı**: 8

| Kolon | Tip | Örnek Değer | Açıklama |
|-------|-----|-------------|----------|
| `auth_user_id` | uuid | "283d293a-1802-49bf-a4dc-be80043a6337" | Supabase auth user referansı |
| `picture_path` | nullable | NULL | Profil resmi yolu |
| `username` | varchar | "webuser1756989305476" | Kullanıcı adı |
| `email` | email (text) | "webtest_1756989305476@example.com" | E-posta adresi |
| `bio` | nullable | NULL | Kullanıcı biyografisi |
| `personality_analyze` | nullable | NULL | Kişilik analizi |
| `created_at` | timestamp with time zone | "2025-09-04T12:35:07.199611+00:00" | Oluşturulma zamanı |
| `updated_at` | timestamp with time zone | "2025-09-04T12:35:07.199611+00:00" | Son güncellenme zamanı |

### content

**Açıklama**: Film ve oyun içerik ana tablosu (TMDB/IGDB verileri)  
**Satır Sayısı**: 31  
**Kolon Sayısı**: 14

| Kolon | Tip | Örnek Değer | Açıklama |
|-------|-----|-------------|----------|
| `id` | integer | 757019 | Primary key (TMDB/IGDB ID) |
| `title` | text | "Fight" | İçerik başlığı |
| `content_type_id` | integer | 1 | İçerik türü (1=Film, 2=Oyun) |
| `release_date` | text | "1973-01-01" | Çıkış tarihi |
| `description` | text | "An improvised hour-long fight between..." | İçerik açıklaması |
| `length` | integer | 50 | Film: dakika, Oyun: ortalama saat |
| `poster_path` | url/path (text) | "/sKLsn8KckO0uP1jaQR7jsmGdkNj.jpg" | Poster/kapak görseli yolu |
| `consume_count` | integer | 0 | İzlenme/oynama sayısı |
| `favorite_count` | integer | 0 | Favoriye ekleme sayısı |
| `list_count` | integer | 0 | Listeye ekleme sayısı |
| `review_count` | integer | 0 | Yorum sayısı |
| `rating_distribution` | integer[] | [0,0,0,0,0] | Rating dağılımı [1★,2★,3★,4★,5★] |
| `created_at` | timestamp with time zone | "2025-08-08T08:30:25.302451+00:00" | Oluşturulma zamanı |
| `updated_at` | timestamp with time zone | "2025-08-08T08:30:25.302451+00:00" | Son güncellenme zamanı |

### review

**Açıklama**: Kullanıcı yorumları ve değerlendirmeleri  
**Satır Sayısı**: 7  
**Kolon Sayısı**: 6

| Kolon | Tip | Örnek Değer | Açıklama |
|-------|-----|-------------|----------|
| `id` | integer | 1 | Primary key |
| `user_id` | uuid | "425e4c7c-51cc-4675-b741-597219c3f35e" | Kullanıcı referansı |
| `content_id` | integer | 980477 | İçerik referansı |
| `text` | text | "dawd" | Yorum metni |
| `created_at` | timestamp with time zone | "2025-09-02T05:02:06.919775+00:00" | Oluşturulma zamanı |
| `updated_at` | timestamp with time zone | "2025-09-02T05:02:06.919775+00:00" | Son güncellenme zamanı |

### latest_user_content_log (View)

**Açıklama**: Kullanıcıların son içerik aktiviteleri (view)  
**Satır Sayısı**: 21  
**Kolon Sayısı**: 10

| Kolon | Tip | Örnek Değer | Açıklama |
|-------|-----|-------------|----------|
| `id` | integer | 101 | Log ID |
| `user_id` | uuid | "425e4c7c-51cc-4675-b741-597219c3f35e" | Kullanıcı referansı |
| `content_id` | integer | 11631 | İçerik referansı |
| `content_status_id` | integer | 1 | Durum (1=İzlendi/Oynandı) |
| `rating` | numeric/decimal | 4.5 | Kullanıcı puanı |
| `is_favorite` | boolean | false | Favori mi? |
| `is_consume_later` | boolean | false | Sonra izle/oyna? |
| `review_id` | nullable | NULL | İlişkili yorum ID |
| `date` | timestamp with time zone | "2025-09-02T19:31:23.355224+00:00" | Log tarihi |
| `updated_at` | timestamp with time zone | "2025-09-02T19:31:23.355224+00:00" | Son güncellenme zamanı |

### ❌ Mevcut Olmayan Ancak Kod'da Referans Edilen Tablolar

Bu tablolar kodda referans edilmekte ancak veritabanında mevcut değil:

| Tablo Adı | Beklenen Amaç | Kod Referansı |
|-----------|---------------|---------------|
| `review_reply` | Yorumlara verilen cevaplar | RPC fonksiyonlarında referans |
| `content_type` | İçerik türü master tablosu | content.content_type_id foreign key |
| `content_status` | İçerik durumu master tablosu | user_content_log.content_status_id |
| `showcase_content` | Vitrin/featured içerikleri | Frontend ana sayfa |
| `x_content_genre` | İçerik-tür ilişki tablosu | Many-to-many ilişki |
| `user_preference` | Kullanıcı tercihleri/ayarları | Profil sayfası |
| `user_notification` | Bildirimler | Notification sistemi |
| `friend_activity` | Arkadaş aktiviteleri | get_friend_activities fonksiyonu |

### 🚨 Kritik Eksiklikler (Screenshot Analizi)

Screenshot'larda görülen ancak veritabanında eksik olan fonksiyonlar:

1. **search_content**: İçerik arama - Frontend'de kullanılıyor
2. **get_content_detail**: İçerik detay sayfası için kritik
3. **get_most_watched_movies**: Ana sayfa için gerekli
4. **get_top_actors_by_movie_count**: Aktör listeleri için
5. **get_user_contents**: Kullanıcı profili için temel fonksiyon

### 📊 Boş Tablolar (Mevcut ama Veri Yok)

| Tablo Adı | Amaç | Durum |
|-----------|------|-------|
| **user_content_log** | Kullanıcı-içerik etkileşim logları (ana tablo) | Boş (0 satır) |
| **g_genre** | Oyun türleri master tablosu | Boş (0 satır) |
| **g_platform** | Oyun platformları master tablosu | Boş (0 satır) |
| **x_game_platform** | Oyun-platform ilişki tablosu | Boş (0 satır) |
| **user_follow** | Kullanıcı takip ilişkileri | Boş (0 satır) |

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

### ⚠️ Mevcut Ancak Sorunlu Fonksiyonlar (2)

| Fonksiyon | Durum | Hata Detayı | Açıklama |
|-----------|-------|-------------|----------|
| `search_content` | SQL hatası | GROUP BY clause sorunu | İçerik arama işlemi yapar |
| `get_recommended_contents` | SQL hatası | GROUP BY clause sorunu | Kullanıcıya önerilen içerikleri getirir |

### ❌ Mevcut Olmayan Fonksiyonlar (4)

| Fonksiyon | Açıklama |
|-----------|-----------| 
| `create_user_content_log` | Yeni kullanıcı-içerik log kaydı oluşturur |
| `get_user_statistics` | Kullanıcı istatistiklerini getirir |
| `search_users` | Kullanıcı arama işlemi yapar |
| `get_content_recommendations` | İçerik önerilerini getirir |

## 📝 Teknik Notlar

### Erişim Kontrolleri
- **RLS (Row Level Security)** politikaları aktif
- Authenticated kullanıcılar kendi verilerine erişebiliyor
- Anonymous erişim çoğu tablo için kısıtlı

### Veri Tipleri
- **UUID**'ler Supabase auth ile uyumlu
- **Timestamp**'ler timezone bilgisiyle saklanıyor
- **JSON/JSONB** alanlar kompleks veri için kullanılıyor
- **Array** tipi rating dağılımı için kullanılıyor

### İlişkiler
- `app_user.auth_user_id` → Supabase auth.users
- `content.id` → TMDB/IGDB external IDs  
- `user_content_log` → Many-to-many user-content relations
- Foreign key constraints ile referential integrity sağlanıyor

### Eksik/Geliştirme Alanları

1. **Master Tablolar**: content_type ve content_status tabloları eksik (enum değerleri hard-coded)

2. **Genre Sistem**: g_genre tablosu boş, x_content_genre tablosu mevcut değil

3. **SQL Hatalar**: 2 RPC fonksiyonunda GROUP BY clause sorunu var

4. **Sosyal Özellikler**: user_follow tablosu boş, friend_activity view'i mevcut değil

5. **Bildirimler**: user_notification tablosu mevcut değil

---

*Bu dokümantasyon otomatik olarak 4 Eylül 2025 tarihinde canlı veritabanından generate edilmiştir.*
