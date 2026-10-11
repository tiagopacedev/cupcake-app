import type { NextConfig } from "next";

/**
 * Local-dev `/api` rewrite (02-architecture.md §5, §8). On Vercel,
 * `vercel.json`'s top-level rewrite routes `/api/*` to the `api` Service
 * directly — this one never runs there, but is still needed for `pnpm dev`.
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
    // 02-architecture §6.5: product photos are static 512 px JPEGs (~30 KB) served
    // straight from /images. Not routed through the /_next/image optimizer: behind
    // the Vercel Services routing (vercel.json) that route returns 404 in production,
    // which broke every photo. Optimizing files this small gains almost nothing.
    unoptimized: true,
  },
};

export default nextConfig;
