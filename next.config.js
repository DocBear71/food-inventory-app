/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },

    // Webpack configuration for browser polyfills
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        // Only apply browser polyfills for client-side builds
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                // Provide browser-compatible versions
                buffer: require.resolve('buffer'),
                process: require.resolve('process/browser'),
                // Disable Node.js modules not needed in browser
                fs: false,
                path: false,
                os: false,
                crypto: false,
                stream: false,
                http: false,
                https: false,
                zlib: false,
                worker_threads: false,
                child_process: false,
            };

            // Provide global polyfills
            config.plugins = [
                ...config.plugins,
                new webpack.ProvidePlugin({
                    Buffer: ['buffer', 'Buffer'],
                    process: 'process/browser',
                }),
            ];
        }

        return config;
    },

    // Experimental features
    experimental: {
        esmExternals: 'loose'
    }
};

console.log('🔥 MOBILE CONFIG LOADED - output: export should create out/ folder');

module.exports = nextConfig