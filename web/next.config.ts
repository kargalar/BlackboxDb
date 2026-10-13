import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import path from 'path';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const bunnyCdnHostname = (() => {
  const bunnyCdnUrl = process.env.NEXT_PUBLIC_BUNNY_CDN_URL;
  if (!bunnyCdnUrl) return undefined;

  try {
    return new URL(bunnyCdnUrl).hostname;
  } catch {
    return undefined;
  }
})();
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  allowedDevOrigins: ['http://127.0.0.1:3000', 'http://localhost:3000'],
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'images.igdb.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'books.googleusercontent.com' },
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      { protocol: 'https', hostname: '**.b-cdn.net' },
      ...(bunnyCdnHostname ? [{ protocol: 'https' as const, hostname: bunnyCdnHostname }] : []),
    ],
  },
  trailingSlash: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
