import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        optimizeCss: true,
        esmExternals: true,
    },
    assetPrefix: undefined,

    // ADD THIS IMAGES CONFIGURATION ↓
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.docbearscomfort.kitchen',
                pathname: '/api/recipes/photos/**',
            },
            // ADD LOCALHOST FOR DEVELOPMENT
            {
                protocol: 'http',
                hostname: 'localhost',
                pathname: '/api/recipes/photos/**',
                port: '3000', // Add your dev port
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
            {
                protocol: 'https',
                hostname: 'cdn.pexels.com',
            },
            {
                protocol: 'https',
                hostname: 'pixabay.com',
            },
            {
                protocol: 'https',
                hostname: 'cdn.pixabay.com',
            }
        ],

        // OPTIONAL: Configure image sizes for optimization
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

        // OPTIONAL: Enable blur placeholder for API images
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },

    // Minimal webpack config to fix NextAuth issues
    webpack: (config, { isServer }) => {
        // Only add essentials for server-side
        if (isServer) {
            config.externals = config.externals || [];
            config.externals.push('mongoose', 'bcryptjs');
        }

        return config;
    },
}

console.log('🔥 MOBILE CONFIG LOADED - output: export should create out/ folder');

export default nextConfig;