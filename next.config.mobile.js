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
    // Skip dynamic routes during static export
    experimental: {
        missingSuspenseWithCSRBailout: false,
    }
}

console.log('🔥 MOBILE CONFIG LOADED - output: export should create out/ folder');

module.exports = nextConfig