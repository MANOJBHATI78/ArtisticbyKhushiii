import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Standard .next build — runs under `next start` (Docker) and the
     Netlify Next.js runtime (functions) alike. */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return {
      // /uploads/* must reach the disk even when ABK_UPLOAD_DIR lives outside
      // the served public/ folder (Docker volume in production).
      // /sitemap.xml → the dynamic, database-driven sitemap so the standard
      // URL works in Google Search Console.
      beforeFiles: [
        { source: "/uploads/:path*", destination: "/api/media/:path*" },
        { source: "/sitemap.xml", destination: "/api/sitemap" },
        // Google Merchant Center product feed — standard-looking URL for
        // easy submission (Admin → Site Settings → Google Shopping shows it).
        { source: "/shopping-feed.xml", destination: "/api/shopping-feed" },
      ],
      afterFiles: [],
      // SPA fallback — runs LAST, after static files AND dynamic routes
      // (e.g. /api/public/products/[slug]) are matched, so any remaining
      // path (like /products or /product/x) serves the single-page app.
      // Deep links + refresh work with clean URLs everywhere.
      fallback: [{ source: "/:path*", destination: "/" }],
    };
  },
};

export default nextConfig;
