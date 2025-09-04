/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        typedRoutes: true,
        missingSuspenseWithCSRBailout: false,
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'image.tmdb.org' },
        ],
        unoptimized: true,
    },
    // output: 'export', // Temporarily disabled for dynamic routes
    trailingSlash: true,
    // Only use basePath and assetPrefix for production builds
    ...(process.env.NODE_ENV === 'production' && {
        basePath: '/BlackboxDb',
        assetPrefix: '/BlackboxDb/',
    }),
};

export default nextConfig;
