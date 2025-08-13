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

    // ENHANCED IMAGES CONFIGURATION WITH RECIPE DOMAINS ↓
    images: {
        remotePatterns: [
            // Your existing domains
            {
                protocol: 'https',
                hostname: 'www.docbearscomfort.kitchen',
                pathname: '/api/recipes/photos/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                pathname: '/api/recipes/photos/**',
                port: '3000',
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
            },

            // ADDED: Recipe website domains (for external recipe images)
            {
                protocol: 'https',
                hostname: 'www.simplyrecipes.com',
            },
            {
                protocol: 'https',
                hostname: 'www.allrecipes.com',
            },
            {
                protocol: 'https',
                hostname: 'www.foodnetwork.com',
            },
            {
                protocol: 'https',
                hostname: 'food.fnr.sndimg.com',
            },
            {
                protocol: 'https',
                hostname: 'www.tasteofhome.com',
            },
            {
                protocol: 'https',
                hostname: 'www.delish.com',
            },
            {
                protocol: 'https',
                hostname: 'hips.hearstapps.com',
            },
            {
                protocol: 'https',
                hostname: 'www.bonappetit.com',
            },
            {
                protocol: 'https',
                hostname: 'assets.bonappetit.com',
            },
            {
                protocol: 'https',
                hostname: 'www.epicurious.com',
            },
            {
                protocol: 'https',
                hostname: 'assets.epicurious.com',
            },
            {
                protocol: 'https',
                hostname: 'static01.nyt.com',
            },
            {
                protocol: 'https',
                hostname: 'imagesvc.meredithcorp.io',
            },
            {
                protocol: 'https',
                hostname: 'cdn.apartmenttherapy.info',
            },
            {
                protocol: 'https',
                hostname: 'www.kingarthurbaking.com',
            },

            // ADDED: Popular food blog domains
            {
                protocol: 'https',
                hostname: 'sallysbakingaddiction.com',
            },
            {
                protocol: 'https',
                hostname: 'joyfoodsunshine.com',
            },
            {
                protocol: 'https',
                hostname: 'www.recipetineats.com',
            },
            {
                protocol: 'https',
                hostname: 'cafedelites.com',
            },
            {
                protocol: 'https',
                hostname: 'therecipecritic.com',
            },
            {
                protocol: 'https',
                hostname: 'natashaskitchen.com',
            },
            {
                protocol: 'https',
                hostname: 'www.budgetbytes.com',
            },
            {
                protocol: 'https',
                hostname: 'damndelicious.net',
            },
            {
                protocol: 'https',
                hostname: 'www.lecremedelacrumb.com',
            },
            {
                protocol: 'https',
                hostname: 'www.saltandlavender.com',
            },
            {
                protocol: 'https',
                hostname: 'www.gimmesomeoven.com',
            },
            {
                protocol: 'https',
                hostname: 'www.loveandlemons.com',
            },
            {
                protocol: 'https',
                hostname: 'minimalistbaker.com',
            },
            {
                protocol: 'https',
                hostname: 'cookieandkate.com',
            },
            {
                protocol: 'https',
                hostname: 'pinchofyum.com',
            },
            {
                protocol: 'https',
                hostname: 'www.halfbakedharvest.com',
            },

            // ADDED: More recipe website domains
            {
                protocol: 'https',
                hostname: 'italianfoodforever.com',
            },
            {
                protocol: 'https',
                hostname: 'www.italianfoodforever.com',
            },
            {
                protocol: 'https',
                hostname: 'www.foodandwine.com',
            },
            {
                protocol: 'https',
                hostname: 'assets.tmecosys.com',
            },
            {
                protocol: 'https',
                hostname: 'www.marthastewart.com',
            },
            {
                protocol: 'https',
                hostname: 'assets.marthastewart.com',
            },
            {
                protocol: 'https',
                hostname: 'www.eatingwell.com',
            },
            {
                protocol: 'https',
                hostname: 'imagesvc.timeincapp.com',
            },
            {
                protocol: 'https',
                hostname: 'www.myrecipes.com',
            },
            {
                protocol: 'https',
                hostname: 'cdn.cnn.com',
            },
            {
                protocol: 'https',
                hostname: 'www.southernliving.com',
            },

        ],

        // Your existing image sizes
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

        // Your existing SVG config + optimization enhancements
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

        // ADDED: Image optimization settings
        formats: ['image/webp', 'image/avif'],
        minimumCacheTTL: 60,

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

    // ADDED: SEO and performance headers
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                ],
            },
            {
                source: '/images/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/icons/(.*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },

    // ADDED: SEO redirects
    async redirects() {
        return [
            {
                source: '/recipes',
                destination: '/recipe-search',
                permanent: true,
            },
            // Add more SEO redirects as needed
        ];
    },
}

console.log('🔥 MOBILE CONFIG LOADED - output: export should create out/ folder');

export default nextConfig;