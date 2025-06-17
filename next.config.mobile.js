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
    // Skip building API routes entirely
    experimental: {
        outputFileTracingExcludes: {
            '*': [
                './src/app/api/**/*',
            ],
        },
    }
}

module.exports = nextConfig