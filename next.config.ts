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