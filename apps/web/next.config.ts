import type { NextConfig } from "next";

/**
 * Rewrites and security headers (02-architecture.md §5 "repository layout",
 * §8 "Security headers"). The browser calls the API through this same-origin
 * `/api/*` rewrite, so it never needs CORS and the API URL stays server-side.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  images: {
    // 02-architecture §6.5: product photos are static files; no remote host needed yet.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
