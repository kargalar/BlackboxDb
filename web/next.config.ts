import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
  { protocol: 'https', hostname: 'image.tmdb.org' },
  { protocol: 'https', hostname: 'images.igdb.com' },
  { protocol: 'https', hostname: 'books.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
