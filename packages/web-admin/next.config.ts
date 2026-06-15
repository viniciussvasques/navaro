import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "https://admin.dunnaa.com.br",
    "http://admin.dunnaa.com.br",
    "http://localhost:3005",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://dunnaa-api:8000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
