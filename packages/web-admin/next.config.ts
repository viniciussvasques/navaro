import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://dunnaa-api:8000/api/v1/:path*', // Proxy to Backend Container
      },
    ];
  },
};

export default nextConfig;
