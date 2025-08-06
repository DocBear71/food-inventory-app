/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    output: 'export',        // Static export for Capacitor
    trailingSlash: true,     // Helps with mobile routing

    images: {
        unoptimized: true    // Required for static export
    },

    // ENHANCED: Webpack config optimized for Capacitor mobile apps
    webpack: (config, { isServer, dev }) => {
        // Client-side configuration for Capacitor apps
        if (!isServer) {
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
                child_process: false,
                cluster: false,
                dgram: false,
                dns: false,
                http: false,
                https: false,
                http2: false,
                zlib: false,
            };
        }

        // Handle externals properly for both server and client
        config.externals = config.externals || [];
        if (isServer) {
            config.externals.push(
                '@capacitor/core',
                '@capacitor/preferences',
                '@capacitor/app',
                'mongoose',
                'bcryptjs'
            );
        }

        return config;
    },

    // Configure for proper static export
    distDir: '.next',
    generateEtags: false,
}

console.log('🔥 MOBILE CONFIG LOADED - Capacitor-optimized for iOS routing');

module.exports = nextConfig;