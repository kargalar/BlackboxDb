/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        typedRoutes: true,
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'image.tmdb.org' },
        ],
        unoptimized: true,
    },
    output: 'export',
    trailingSlash: true,
    basePath: '/BlackboxDb',
    assetPrefix: '/BlackboxDb/',
};

export default nextConfig;
