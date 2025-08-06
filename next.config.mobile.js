/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    output: 'export',
    trailingSlash: true,
    
    images: {
        unoptimized: true
    },
    
    // ENHANCED: Better webpack config for Capacitor
    webpack: (config, { isServer, dev }) => {
        // Client-side configuration for Capacitor
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
        
        // Handle externals properly
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