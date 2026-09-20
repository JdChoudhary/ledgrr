import type { NextConfig } from "next";
const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_INTERNAL_URL}/api/:path*`,
      },
      {
        source: "/trpc/:path*",
        destination: `${API_INTERNAL_URL}/trpc/:path*`,
      },
    ];
  },
};

export default nextConfig;
