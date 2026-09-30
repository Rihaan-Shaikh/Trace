/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl.replace(/\/+$/, '')}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
