import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "https://dunnaa.com.br",
    "http://dunnaa.com.br",
    "https://www.dunnaa.com.br",
    "http://www.dunnaa.com.br",
    "http://localhost:3007",
  ],
  async rewrites() {
    return [
      {
        source: "/app",
        destination: "/app/index.html",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/downloads/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="dunnaa-cliente.apk"',
          },
        ],
      },
      {
        source: "/app/version.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        source: "/app/index.html",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/app/_expo/static/js/web/entry-:hash.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/app/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600",
          },
        ],
      },
      {
        source: "/app/:path*",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/app/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
