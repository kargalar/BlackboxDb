# Test Dosyaları

Bu klasör BlackboxDb projesi için yazılan test dosyalarını içerir.

## 📁 Dosya Listesi

### Database Schema
- `extract-schema.js` - Canlı veritabanından tablo yapısını çıkarır
- `schema-output.txt` - Schema çıktısı

### Connection Tests
- `test-db.js` - Temel veritabanı bağlantı testi
- `check-app-user.js` - app_user tablosu kontrol testi

### Authentication Tests  
- `test-auth-insert.js` - Auth kullanıcı oluşturma ve insert testi
- `test-with-session.js` - Session ile test işlemleri
- `simulate-registration.js` - Tam kayıt akışı simulasyonu
- `test-real-flow.js` - Gerçek kullanıcı akışı testi

### Table Structure Tests
- `test-app-user.js` - app_user tablo yapısı testi
- `get-schema.js` - Tablo şeması analiz testi

### Cleanup
- `cleanup-test.js` - Test kullanıcıları temizleme

## 🚀 Kullanım

Test dosyalarını çalıştırmak için:

```bash
cd tests
node [test-dosyasi-adi].js
```

**Örnek:**
```bash
node test-db.js
node simulate-registration.js
```

## ⚠️ Dikkat

- Test dosyaları gerçek Supabase veritabanına bağlanır
- Bazı testler gerçek kullanıcı hesapları oluşturur
- Test sonrası temizlik için `cleanup-test.js` kullanın

## 📊 Test Sonuçları

Son test sonuçları:
- ✅ Veritabanı bağlantısı çalışıyor
- ✅ Authentication sistemi çalışıyor  
- ✅ app_user trigger'ı çalışıyor
- ✅ RLS politikaları doğru çalışıyor
- ✅ Web kayıt akışı tam çalışıyor
