import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: [
    "https://pro.dunnaa.com.br",
    "http://pro.dunnaa.com.br",
    "http://localhost:3006",
  ],
};

export default nextConfig;
