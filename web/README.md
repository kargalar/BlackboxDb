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


## IGDB Integration

This project supports IGDB (video games) data via a secure server-side proxy.

Setup:

- Create a Twitch Developer application at https://dev.twitch.tv/console/apps to obtain Client ID and Client Secret.
- In `web/.env.local`, add:

```
IGDB_TWITCH_CLIENT_ID=your_twitch_client_id
IGDB_TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

Routes exposed:

- `GET /api/igdb/search?q=zelda&limit=10`
- `GET /api/igdb/games/:id`

Client helpers:

- `igdbSearch(q: string, limit?: number)`
- `igdbGetGame(id: number)`

Utilities:

- `igdbImageUrl(imageId: string, size?: string)` to build image URLs.

Notes:

- Tokens are fetched from Twitch and cached on the server with a safety margin. No secrets are exposed to the browser.
- Keep queries modest to respect rate limits; basic backoff is implemented.
