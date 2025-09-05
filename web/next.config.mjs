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
    trailingSlash: true,
    // Remove basePath and assetPrefix for Vercel deployment
    // Only use for GitHub Pages if needed
    // basePath: '/BlackboxDb',
    // assetPrefix: '/BlackboxDb/',
};

export default nextConfig;
