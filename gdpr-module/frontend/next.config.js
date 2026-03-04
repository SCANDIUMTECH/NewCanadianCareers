/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API requests to Django backend
  // GDPR_PROXY_TARGET is server-side only (not exposed to browser)
  async rewrites() {
    const backendUrl = process.env.GDPR_PROXY_TARGET || "http://localhost:8000";
    return [
      {
        source: "/api/gdpr/:path*",
        destination: `${backendUrl}/api/gdpr/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
