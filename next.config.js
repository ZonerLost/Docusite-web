/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pages Router configuration
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable SWC minification for better performance
  swcMinify: true,
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  // Enable compression
  compress: true,
}

module.exports = nextConfig
