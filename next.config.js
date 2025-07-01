/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    output: 'export',        // Only for mobile builds
    trailingSlash: true,
    images: {
        unoptimized: true
    }
}

console.log('🔥 MOBILE CONFIG LOADED - output: export should create out/ folder');

module.exports = nextConfig