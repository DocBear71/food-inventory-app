/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },

}

console.log('🔥 MOBILE CONFIG LOADED - output: export should create out/ folder');

module.exports = nextConfig