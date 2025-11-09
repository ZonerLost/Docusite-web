/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pages Router configuration
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable SWC minification for better performance
  swcMinify: true,
  // Optimize images and allow Firebase Storage host
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    // Explicitly allow placeholder domain for dev avatars
    domains: ['placehold.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
  },
  // Enable compression
  compress: true,
}

module.exports = nextConfig
