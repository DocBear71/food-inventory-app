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
    assetPrefix: process.env.NODE_ENV === 'production' ? 'https://www.docbearscomfort.kitchen' : undefined,

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

    // Enhanced webpack config to fix NextAuth + PostHog issues
    webpack: (config, { isServer }) => {
        // Server-side externals (your existing config)
        if (isServer) {
            config.externals = config.externals || [];
            config.externals.push('mongoose', 'bcryptjs');
        } else {
            // Client-side fixes for PostHog
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
                stream: false,
                buffer: false,
                util: false,
                url: false,
                querystring: false,
                path: false,
                os: false,
                readline: false,
                // Additional Node.js modules that might cause issues
                child_process: false,
                cluster: false,
                dgram: false,
                dns: false,
                http: false,
                https: false,
                http2: false,
                zlib: false,
            };

            // Exclude posthog-node from client-side bundles
            config.externals = config.externals || [];
            config.externals.push('posthog-node');
        }

        return config;
    },
}

console.log('🔥 MOBILE CONFIG LOADED - output: export should create out/ folder');

export default nextConfig;