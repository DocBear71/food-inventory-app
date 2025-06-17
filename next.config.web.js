/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // No static export for web version
    images: {
        unoptimized: false
    }
}

module.exports = nextConfig