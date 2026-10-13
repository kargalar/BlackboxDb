# Veritabanı ve veri erişimi incelemesi — 13 Ekim 2026

80 PostgreSQL tablosunun şeması, indeksleri, kısıtları ve migration geçmişi incelendi. Ana içerik/arama, profil istatistikleri, inceleme eşleştirme, kitap yayınları, filtre sayaçları, medya oylama ve istemci önbelleği akışları iyileştirildi.

## Veri koruma

79 uygulama tablosunun satır sayıları ve bütün satır içeriklerinden hesaplanan özetleri, ana veritabanındaki indeks değişikliklerinden önce ve sonra aynı çıktı. **1.397.009 uygulama kaydı korundu.** Migration kayıtları içerik karşılaştırmasının dışında tutuldu.

Tam yedek: [database.dump](../server/backups/database/2026-10-13T08-39-33-082Z/database.dump). SHA-256: `af5cf35c7af51a3ee5a48de60db9d617cf694f372ab6ff84e4219c57643f8ab1`. Arşiv ayrı bir PostgreSQL veritabanına geri yüklendi; yeni indeksler önce bu kopyada çalıştırıldı. Yedekler ve çalışma raporları Git dışında tutuluyor.

## Uygulanan değişiklikler

- Dokuz indeks: kişi adı için trigram ve sıralama; kişi/rol/içerik ilişkisi; içerik görselleri; ekran görüntüleri; bildirim akışı ve okunmamış bildirimler; kullanıcı aktivitesi; inceleme eşleştirme.
- İndeksler tabloyu yeniden oluşturmadan `CREATE INDEX CONCURRENTLY` ile eklendi. Trigram eklentisi ayrı migration ile tanımlandı. Kolonlar, kullanıcı geçmişi ve kaynak verileri silinmedi.
- Üç UUID varsayılanı ve uzun indeks adı, mevcut PostgreSQL tanımıyla Prisma arasında eşitlendi. Son şema karşılaştırması boş; migration durumu güncel.
- İçerik sorguları istenen GraphQL alanlarına göre Prisma `select` oluşturuyor; fragment ve alias destekleniyor. Liste kartlarında ilgisiz oyuncu biyografileri, ekran görüntüleri ve cast/crew JSON'ları çekilmiyor.
- Kitap yayınları, kullanıcıya göre tercih edilen yayınlar, inceleme eşleştirmesi ve tüketim sayaçları istek başına toplu okunuyor. Önbellek kullanıcılar/istekler arasında paylaşılmıyor; özel inceleme filtreleri korunuyor.
- Kişi filtre sayaçları SQL'de özetlenip iki JSON sonuç satırında getiriliyor. Silinmiş içerikler ilişki sayaçlarına dahil edilmiyor.
- Kullanıcı istatistiklerinde yalnızca gerekli log alanları ve içerik türü okunuyor.
- Soft-delete filtresi okumadan önce uygulanıyor; `select` içinde `isDeleted` bulunmasa da silinmiş kayıt gizleniyor. Çağıranın sorgu nesnesi değiştirilmez.
- Görsel ve ekran görüntüsü oyları transaction ve satır kilidi altında güncelleniyor; eşzamanlı istekler mükerrer oy veya bozuk sayaç oluşturmuyor.
- Sayfa boyutu/offset sınırları merkezi olarak uygulanıyor; `contents` için offset desteği ve deterministik sıralama eklendi.
- Apollo'da sayfa/tür/boyut sonuçları ayrıldı; yeniden sorgulama eski veya silinmiş satırları biriktirmiyor. API'nin sağlamadığı istatistik alanları TypeScript modelinden çıkarıldı.
- Yinelenen kitap başlığı resolver'ı ve kullanılmayan arama servisi/generatör kopyaları kaldırıldı. Kimlik doğrulama çerezi artık dil başlığının kullanılmasını engellemiyor.

## Ölçümler

İndeks ölçümleri aynı geri yüklenmiş veri üzerinde, her sorgunun beş çalıştırmasının medyanıdır. Donanım ve yük altında farklılaşabilir.

| Ölçüm                                            |           Önce |              Sonra |
| ------------------------------------------------ | -------------: | -----------------: |
| Kişi adında alt dize araması                     |      67,512 ms |           1,230 ms |
| Sıralanmış ilk kişi sayfası                      |      61,684 ms |           0,022 ms |
| 20 içeriklik liste için SQL okuması              |             20 |                  4 |
| Aynı listenin DB → uygulama verisi               | 4.817.515 bayt |        12.738 bayt |
| Film kişi/rol sayaçlarında taşınan ilişki satırı |        531.828 | 2 JSON özet satırı |

Temel liste alanları eski ve yeni sorgu arasında birebir karşılaştırıldı. JSON sayaç sonucu önceki groupBy sonucuyla aynı. İndeksler okuma performansı için ek disk ve yazma maliyeti getirir; uygulama verisi boyutu küçültülmüş değildir.

## Doğrulama

- Backend Prisma doğrulaması, TypeScript kontrolü ve derleme.
- Frontend TypeScript, lint, Prettier ve üretim derlemesi.
- Backend: 17 birim/regresyon testi; frontend: 14 test.
- Ayrı test DB'sinde sekiz eşzamanlı oy, transaction hatasında rollback, soft-delete alan seçimi, filtre sayaçları ve eski/yeni liste verisi eşitliği.
- HTTP üzerinden içerik listesi, keşif, puan sıralaması, kitap alanları, metin araması, geçersiz sayfalama, kişi araması ve filtre sayaçları.
- Başlangıç kısıtlarının tamamı doğrulanmış; migration durumu güncel ve Prisma–PostgreSQL şema farkı yok.

## Tasarım değerlendirmesi ve sınırlar

Kullanıcı logları geçmiş kaydı olduğu için kullanıcı/içerik çiftini tek satıra indirmek tekrar izleme/okuma geçmişini kaybettirir. İçerik türü ayrıntıları, kitap yayınları ve medya alt tabloları bu ilişki yapısıyla korundu. Ham cast/crew JSON'ları dış servis kaynak bilgisini saklıyor; sorgu seçimiyle gereksiz taşınmaları azaltıldı.

Bu inceleme genel bir “10/10” veya bütün kodda hata yok garantisi değildir. Metin, puan ve kullanıcı tarihi sıralamaları artık PostgreSQL’de yapılıyor. Karmaşık ilişki filtreleri için Prisma’dan hâlâ aday kimlik listesi okunuyor; bu listeler puan veya log verisi taşımıyor. Daha büyük veri hacminde bu geçişin tamamen SQL’e alınması ve cursor tabanlı sayfalama ayrıca ölçülerek tasarlanmalı. Eski geniş resolver'lar ve kapalı `strictNullChecks` kademeli dönüşüm gerektiriyor. Bu konular için ölçülmemiş hız veya doğruluk iddiası yapılmadı.

Geri dönüş gerekirse yedeği **yeni bir veritabanına** geri yükleyin ve uygulamanın bağlantısını o DB'ye yönlendirin. Mevcut DB üzerinde otomatik temizleme/restore çalıştırılmadı. İndeksleri geri almak gerekiyorsa yeni bir migration kullanın; uygulanmış migration dosyalarını veya geçmişini değiştirmeyin.

## Tekrar çalıştırma

`server` dizininden: `npm run db:audit -- inspect-database.json`, `npm run db:backup`, `npm test`, `npm run typecheck`. `db:verify-backup` .dump dosyasını ayrı DB'ye açar. `db:verify-behavior` yalnızca doğrulanmış test DB manifestiyle çalışır; ana DB'de fixture oluşturmaz.

Yöntem referansları: [PostgreSQL concurrent indeks belgeleri](https://www.postgresql.org/docs/current/sql-createindex.html), [Prisma 6 sorgu optimizasyonu](https://www.prisma.io/docs/orm/v6/prisma-client/queries/query-optimization-performance).

## Ek iyileştirme: arama ve sayfalama

- Puan ortalaması, puan aralığı, metin ilgisi ve kullanıcı tarihi SQL’de hesaplanıp sıralanıyor. Basit filtrelerde uygulamaya yalnızca sayfanın kimlikleri ve toplam kayıt sayısı geliyor; tüm puan/log kayıtlarının JavaScript’te sıralanması kaldırıldı.
- Kullanıcı tarihi sıralamasında atlanan puan aralığı filtresi düzeltildi. Eşit sıralama değerlerinde içerik kimliğiyle kararlı sıra sağlandı. Tarih sıralamasında en son log seçimi ve logsuz içeriklerin davranışı korundu.
- Karmaşık ilişki filtreleri Prisma üzerinden uygulanıyor. Parametreli SQL kullanılıyor; kullanıcıdan gelen sıralama/metin SQL koduna eklenmiyor.
- Ekran görüntüsü toplam/etkin sayaçları birlikte istendiğinde iki sorgu yerine bir toplu sorgu çalışıyor. İstenmeyen veya GraphQL `@skip` / `@include` ile atlanan sayaçlar için sorgu yapılmıyor; pahalı ilişkilerde de yönergeler dikkate alınıyor.
- Arama resolver’ındaki yinelenen dallar ortak, tipli bir sayfalama fonksiyonuna taşındı.

Gerçek veride, PostgreSQL tarafından **READ ONLY** olarak zorlanan ve tutarlı bir snapshot kullanan doğrulamada **71 karşılaştırma geçti**. Bunlar artan/azalan puan, sıfır ve boş aralıklar, yüksek offset, ilişki filtreleri, metin ilgisi, film/oyun/kitap süre sıralamaları, kullanıcı tarihi + puan aralığı ve ekran görüntüsü sayaçlarını kapsıyor. Her testte toplam ve sayfa kimlikleri karşılaştırıldı; sayaçlarda sorgu sayısı da doğrulandı.

20 filmlik puan sayfasının sıralama adımında önce 4.629 puan kaydı / 532.473 bayt okunuyordu; yeni sorgu 20 kimlik ve toplamı tek SQL sonucunda getiriyor: azalan sırada 569 bayt. Bu ölçüm tam HTTP yanıtını veya bütün uygulamayı temsil etmez. Karmaşık filtrelerde aday kimlik okuması ayrıca gerekir.

Backend’de 18 birim/regresyon testi, TypeScript kontrolü ve üretim derlemesi geçti. HTTP üzerinden sekiz arama senaryosu ve tarayıcıda film puan sıralaması/sayfalama kontrol edildi. Bu tur uygulama verilerine veya şemaya yazmadı.

Tekrar doğrulama: `npm run db:verify-search`. Sonuç dosyası `server/inspect-content-search.json` Git dışında tutulur.

## Tablo envanteri

| Tablo                        |   Kayıt | İçerik karşılaştırması     |
| ---------------------------- | ------: | -------------------------- |
| `_TaggedUsers`               |       0 | Aynı                       |
| `_prisma_migrations`         |      46 | Geçiş geçmişi; kapsam dışı |
| `age_rating`                 |       7 | Aynı                       |
| `app_config`                 |       1 | Aynı                       |
| `app_user`                   |       7 | Aynı                       |
| `book_publication`           |     224 | Aynı                       |
| `company`                    |   9,189 | Aynı                       |
| `company_role`               |       6 | Aynı                       |
| `company_translation`        |       0 | Aynı                       |
| `content`                    |   8,612 | Aynı                       |
| `content_citation`           |      86 | Aynı                       |
| `content_company`            |  22,157 | Aynı                       |
| `content_edit_history`       |     188 | Aynı                       |
| `content_game_engine`        |   1,874 | Aynı                       |
| `content_game_mode`          |   5,065 | Aynı                       |
| `content_genre`              |  19,146 | Aynı                       |
| `content_image`              |  18,099 | Aynı                       |
| `content_mood`               |       0 | Aynı                       |
| `content_person`             | 769,489 | Aynı                       |
| `content_perspective`        |   3,307 | Aynı                       |
| `content_platform`           |   9,588 | Aynı                       |
| `content_recommendation`     |       0 | Aynı                       |
| `content_request`            |       2 | Aynı                       |
| `content_screenshot`         |  22,507 | Aynı                       |
| `content_similarity`         |       4 | Aynı                       |
| `content_theme`              |  42,657 | Aynı                       |
| `content_translation`        |       0 | Aynı                       |
| `content_type_lookup`        |       8 | Aynı                       |
| `contribution`               |       6 | Aynı                       |
| `discussion`                 |     171 | Aynı                       |
| `discussion_comment`         |      24 | Aynı                       |
| `discussion_comment_mention` |       0 | Aynı                       |
| `discussion_comment_vote`    |       0 | Aynı                       |
| `discussion_vote`            |       1 | Aynı                       |
| `expansion`                  |     393 | Aynı                       |
| `franchise`                  |   1,340 | Aynı                       |
| `game_engine`                |     325 | Aynı                       |
| `game_mode`                  |       6 | Aynı                       |
| `genre`                      |      53 | Aynı                       |
| `import_job`                 |      22 | Aynı                       |
| `language`                   |     110 | Aynı                       |
| `media_event`                |       0 | Aynı                       |
| `media_event_credit`         |       0 | Aynı                       |
| `mood`                       |       0 | Aynı                       |
| `music_release_track`        |       0 | Aynı                       |
| `notification`               |      48 | Aynı                       |
| `person`                     | 338,179 | Aynı                       |
| `person_role`                |     888 | Aynı                       |
| `person_translation`         |       0 | Aynı                       |
| `perspective`                |       6 | Aynı                       |
| `platform`                   |     106 | Aynı                       |
| `podcast_episode`            |       0 | Aynı                       |
| `podcast_episode_credit`     |       0 | Aynı                       |
| `podcast_program`            |       0 | Aynı                       |
| `podcast_program_credit`     |       0 | Aynı                       |
| `quiz_leaderboard`           |       1 | Aynı                       |
| `quiz_result`                |       1 | Aynı                       |
| `quiz_settings`              |       4 | Aynı                       |
| `report`                     |       2 | Aynı                       |
| `similarity_group`           |       9 | Aynı                       |
| `similarity_group_item`      |      23 | Aynı                       |
| `theme`                      |   2,328 | Aynı                       |
| `tv_episode`                 | 110,426 | Aynı                       |
| `tv_season`                  |   2,826 | Aynı                       |
| `user_content_log`           |   3,981 | Aynı                       |
| `user_content_preference`    |       0 | Aynı                       |
| `user_episode_log`           |   3,321 | Aynı                       |
| `user_event_attendance`      |       0 | Aynı                       |
| `user_expansion_log`         |       0 | Aynı                       |
| `user_favorite_person`       |       3 | Aynı                       |
| `user_featured_content`      |      14 | Aynı                       |
| `user_follow`                |       2 | Aynı                       |
| `user_image_vote`            |       0 | Aynı                       |
| `user_list`                  |      10 | Aynı                       |
| `user_list_collaborator`     |       0 | Aynı                       |
| `user_list_item`             |     156 | Aynı                       |
| `user_list_vote`             |       0 | Aynı                       |
| `user_podcast_listen`        |       0 | Aynı                       |
| `user_saved_list`            |       0 | Aynı                       |
| `user_screenshot_vote`       |       1 | Aynı                       |
