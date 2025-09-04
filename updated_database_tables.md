# BlackboxDb Veritabanı Şeması

*Son Güncelleme: 4 Eylül 2025*  
*Kaynak: Canlı Supabase Veritabanı*

## 📋 Tablo Özeti

| Tablo Adı | Satır Sayısı | Açıklama |
|-----------|--------------|----------|
| `app_user` | 1 | Uygulama kullanıcı profilleri |
| `content` | 31 | Film/oyun içerik verileri |
| `user_content_log` | 0 | Kullanıcı içerik etkileşim logları |
| `review` | 7 | Kullanıcı yorumları |
| `g_genre` | 0 | Oyun türleri |
| `g_platform` | 0 | Oyun platformları |
| `x_game_platform` | 0 | Oyun-platform ilişki tablosu |
| `user_follow` | 0 | Kullanıcı takip ilişkileri |
| `latest_user_content_log` | 21 | Son kullanıcı aktivitesi (view) |

## 📊 Tablo Detayları

### app_user
**Açıklama**: Supabase auth ile entegre kullanıcı profil tablosu  
**Primary Key**: `auth_user_id` (UUID)  
**Satır Sayısı**: 1

| Kolon | Tip | Açıklama | Örnek Değer |
|-------|-----|----------|-------------|
| `auth_user_id` | uuid | Supabase auth user ID (PK) | `283d293a-1802-49bf-a4dc-be80043a6337` |
| `picture_path` | text | Profil resmi yolu | `NULL` |
| `username` | varchar(255) | Kullanıcı adı | `webuser1756989305476` |
| `email` | varchar(255) | E-posta adresi | `webtest_1756989305476@example.com` |
| `bio` | text | Kullanıcı biyografisi | `NULL` |
| `personality_analyze` | text | Kişilik analizi | `NULL` |
| `created_at` | timestamp | Oluşturulma zamanı | `2025-09-04T12:35:07.199611+00:00` |
| `updated_at` | timestamp | Güncellenme zamanı | `2025-09-04T12:35:07.199611+00:00` |

### content
**Açıklama**: Film ve oyun içerik ana tablosu  
**Primary Key**: `id` (integer - TMDB ID)  
**Satır Sayısı**: 31

| Kolon | Tip | Açıklama | Örnek Değer |
|-------|-----|----------|-------------|
| `id` | integer | İçerik ID (TMDB/IGDB ID) | `757019` |
| `title` | text | İçerik başlığı | `Fight` |
| `content_type_id` | integer | İçerik türü (1=Film, 2=Oyun) | `1` |
| `release_date` | date | Çıkış tarihi | `1973-01-01` |
| `description` | text | İçerik açıklaması | `An improvised hour-long fight...` |
| `length` | integer | Film: dakika, Oyun: ortalama saat | `50` |
| `poster_path` | text | Poster/kapak görseli yolu | `/sKLsn8KckO0uP1jaQR7jsmGdkNj.jpg` |
| `consume_count` | integer | İzlenme/oynama sayısı | `0` |
| `favorite_count` | integer | Favoriye ekleme sayısı | `0` |
| `list_count` | integer | Listeye ekleme sayısı | `0` |
| `review_count` | integer | Yorum sayısı | `0` |
| `rating_distribution` | integer[] | Rating dağılımı [1★,2★,3★,4★,5★] | `[0,0,0,0,0]` |
| `created_at` | timestamp | Oluşturulma zamanı | `2025-08-08T08:30:25.302451+00:00` |
| `updated_at` | timestamp | Güncellenme zamanı | `2025-08-08T08:30:25.302451+00:00` |

### user_content_log
**Açıklama**: Kullanıcı-içerik etkileşim logları (izleme, rating, favori)  
**Primary Key**: `id` (integer)  
**Satır Sayısı**: 0 (boş tablo)

**Beklenen Kolonlar**:
- `id` - Log ID (PK)
- `user_id` - Kullanıcı ID (FK → app_user.auth_user_id)
- `content_id` - İçerik ID (FK → content.id)
- `content_status_id` - Durum (1=İzlendi, 2=İzliyor, 3=İzleyecek, vb.)
- `rating` - Kullanıcı puanı (1-5)
- `is_favorite` - Favori mi?
- `is_consume_later` - Sonra izle/oyna listesinde mi?
- `review_id` - İlişkili yorum ID
- `date` - Log tarihi

### review
**Açıklama**: İçerik yorumları  
**Primary Key**: `id` (integer)  
**Satır Sayısı**: 7

| Kolon | Tip | Açıklama | Örnek Değer |
|-------|-----|----------|-------------|
| `id` | integer | Yorum ID (PK) | `1` |
| `user_id` | uuid | Kullanıcı ID (FK) | `425e4c7c-51cc-4675-b741-597219c3f35e` |
| `content_id` | integer | İçerik ID (FK) | `980477` |
| `text` | text | Yorum metni | `dawd` |
| `created_at` | timestamp | Oluşturulma zamanı | `2025-09-02T05:02:06.919775+00:00` |
| `updated_at` | timestamp | Güncellenme zamanı | `2025-09-02T05:02:06.919775+00:00` |

### latest_user_content_log (View)
**Açıklama**: Kullanıcıların içerik ile son etkileşimleri  
**Satır Sayısı**: 21

| Kolon | Tip | Açıklama | Örnek Değer |
|-------|-----|----------|-------------|
| `id` | integer | Log ID | `101` |
| `user_id` | uuid | Kullanıcı ID | `425e4c7c-51cc-4675-b741-597219c3f35e` |
| `content_id` | integer | İçerik ID | `11631` |
| `content_status_id` | integer | Durum | `1` |
| `rating` | numeric | Kullanıcı puanı | `4.5` |
| `is_favorite` | boolean | Favori mi? | `false` |
| `is_consume_later` | boolean | Sonra izle/oyna? | `false` |
| `review_id` | integer | Yorum ID | `NULL` |
| `date` | timestamp | Log tarihi | `2025-09-02T19:31:23.355224+00:00` |
| `updated_at` | timestamp | Güncellenme zamanı | `2025-09-02T19:31:23.355224+00:00` |

## 🔧 RPC Fonksiyonları

Aşağıdaki stored procedure'lar mevcuttur:

| Fonksiyon | Durum | Açıklama |
|-----------|-------|----------|
| `get_user_contents` | ✅ Var | Kullanıcının içerik listesini getirir |
| `get_content_detail` | ✅ Var | İçerik detaylarını getirir |
| `search_content` | ✅ Var | İçerik arama yapar |
| `get_trend_contents` | ✅ Var | Trend içerikleri getirir |
| `get_recommended_contents` | ✅ Var | Önerilen içerikleri getirir |
| `get_friend_activities` | ✅ Var | Arkadaş aktivitelerini getirir |
| `get_user_info_with_stats` | ✅ Var | Kullanıcı bilgi ve istatistiklerini getirir |
| `recompute_content_stats` | ✅ Var | İçerik istatistiklerini yeniden hesaplar |

## 🚨 Eksik/Boş Tablolar

Aşağıdaki tablolar boş veya mevcut değil:

- `content_type` - ❌ Mevcut değil (enum olarak kullanılıyor olabilir)
- `content_status` - ❌ Mevcut değil (enum olarak kullanılıyor olabilir)
- `g_genre` - ⚠️ Boş tablo
- `g_platform` - ⚠️ Boş tablo
- `x_game_platform` - ⚠️ Boş tablo
- `x_content_genre` - ❌ Mevcut değil
- `user_follow` - ⚠️ Boş tablo
- `friend_activity` - ❌ Mevcut değil

## 📝 Notlar

1. **Authentication**: Sistem Supabase auth ile entegre çalışıyor, `app_user.auth_user_id` ile bağlantı kuruluyor.

2. **RLS (Row Level Security)**: Tablolarda RLS aktif, sadece authenticated kullanıcılar kendi verilerine erişebiliyor.

3. **Triggers**: Auth user oluştuğunda otomatik `app_user` kaydı oluşturuluyor.

4. **Content Types**: 
   - `1` = Film (Movie)
   - `2` = Oyun (Game)

5. **Content Status**: 
   - `1` = İzlendi/Oynandı (Consumed)
   - Diğer durumlar için enum tablosu eksik

6. **İstatistikler**: Content tablosundaki aggregate alanlar (`consume_count`, `favorite_count`, vb.) real-time güncelleniyor.

---

*Bu dokümantasyon canlı veritabanından otomatik olarak generate edilmiştir.*
