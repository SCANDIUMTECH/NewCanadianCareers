/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Dev: skip optimization (localhost resolves to private IP inside Docker).
    // Prod: optimize via real domain (orion.jobs) which resolves to a public IP.
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: '*.orion.jobs',
        pathname: '/media/**',
      },
    ],
  },
}

export default nextConfig
