# Blackbox Site (Next.js + Tailwind)

Minimal başlangıç iskeleti. Node.js 18+ gerektirir.

## Kurulum

```pwsh
# bağımlılıkları kur
npm install

# geliştirme sunucusu
npm run dev

# üretim derleme ve çalıştırma
npm run build
npm start
```

## Ortam Değişkenleri

`.env.local` dosyası oluşturun (örnek aşağıda):

```env
NEXT_PUBLIC_SITE_NAME=Blackbox
TMDB_API_KEY=
IGDB_TWITCH_CLIENT_ID=
IGDB_TWITCH_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

## Notlar

- Tailwind kuruludur, `src/app/globals.css` dosyasını düzenleyebilirsiniz.
- Basit bir `Button` bileşeni ekli.
- `app` yönlendirici aktiftir, sayfalar `src/app/*` altında.
