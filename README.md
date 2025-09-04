# BlackboxDb 🎬🎮

Modern film ve oyun keşif platformu. TMDB API entegrasyonu ile filmler, Supabase ile authentication ve GitHub Pages üzerinde hosting.

![BlackboxDb](https://img.shields.io/badge/BlackboxDb-Live-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0-38B2AC)

## 🚀 Özellikler

- **Film Keşfi**: TMDB API ile güncel film veritabanı
- **Modern UI**: Tailwind CSS ile responsive tasarım
- **Authentication**: Supabase ile Google OAuth
- **Film Detayları**: Cast, crew, trailer ve benzer filmler
- **Responsive**: Mobil ve desktop uyumlu
- **Static Export**: GitHub Pages üzerinde hosting

## 🛠️ Teknolojiler

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Authentication**: Supabase Auth
- **API**: TMDB (The Movie Database)
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions

## 🌐 Demo

Site canlı olarak şu adreste yayında: [https://kargalar.github.io/BlackboxDb](https://kargalar.github.io/BlackboxDb)

## 🏃‍♂️ Yerel Geliştirme

```bash
# Repository'yi klonlayın
git clone https://github.com/kargalar/BlackboxDb.git

# Web klasörüne gidin
cd BlackboxDb/web

# Bağımlılıkları yükleyin
npm install

# Environment dosyasını oluşturun
cp .env.example .env.local

# Geliştirme server'ını başlatın
npm run dev
```

Site `http://localhost:3000` adresinde çalışacaktır.

## 📱 Ekran Görüntüleri

### Ana Sayfa
Modern hero section ve özellik kartları

### Keşfet Sayfası
TMDB entegrasyonu ile film arama ve filtreleme

### Film Detay
Kapsamlı film bilgileri, cast ve trailer

### Authentication
Google OAuth ile güvenli giriş

## 🔑 Environment Variables

```bash
# TMDB API
TMDB_API_KEY=your_tmdb_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add some amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 👨‍💻 Geliştirici

**Kargalar** - [GitHub](https://github.com/kargalar)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!
