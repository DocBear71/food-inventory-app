/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // NO output: 'export' for web deployment!
    // NO console.log debug messages!
    images: {
        unoptimized: false
    }
}

module.exports = nextConfig