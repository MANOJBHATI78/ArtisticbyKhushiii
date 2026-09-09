import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return {
      // /uploads/* must reach the disk even when ABK_UPLOAD_DIR lives outside
      // the served public/ folder (Docker volume in production).
      beforeFiles: [{ source: "/uploads/:path*", destination: "/api/media/:path*" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
