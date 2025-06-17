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
    distDir: '.next',  // Build directory
    // The export goes to 'out' by default when output: 'export' is set
}

console.log('🔥 MOBILE CONFIG LOADED - output: export should create out/ folder');

module.exports = nextConfig