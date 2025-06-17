/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // No static export for web - keep as regular Next.js app
    images: {
        unoptimized: false
    }
}

module.exports = nextConfig