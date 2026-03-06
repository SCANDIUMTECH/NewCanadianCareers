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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://challenges.cloudflare.com",
              "frame-src https://challenges.cloudflare.com https://checkout.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com",
              "object-src 'none'",
            ].join('; ')
          },
        ],
      },
    ]
  },
}

export default nextConfig
