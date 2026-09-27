"use client";

import dynamic from "next/dynamic";
import { useHashRoute, navigate } from "@/lib/router";
import { useEffect } from "react";

const SiteApp = dynamic(() => import("@/components/site/site-app"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background" role="status" aria-label="Loading website">
      {/* Logo with black → colour reveal (top-to-bottom wipe) */}
      <div className="relative h-20 w-20" aria-hidden="true">
        <img src="/images/logo.png" alt="" className="absolute inset-0 h-full w-full object-contain brightness-0 opacity-30" />
        <img src="/images/logo.png" alt="" className="absolute inset-0 h-full w-full object-contain splash-reveal" />
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/2 animate-shimmer rounded-full" />
      </div>
      <p className="text-sm text-muted-foreground">Preparing handcrafted goodness…</p>
    </div>
  ),
});

const AdminApp = dynamic(() => import("@/components/admin/admin-app"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="font-display text-2xl text-primary">Loading Studio Console…</div>
    </div>
  ),
});

/**
 * The client-rendered SPA shell (site + admin). Lives in its own client
 * component so src/app/page.tsx can stay a server component and decide,
 * per request, whether the requested path is a real route — unknown paths
 * get a genuine 404 status (not a soft-404) for clean Google indexing.
 */
export default function SpaShell() {
  const route = useHashRoute();

  // Global interceptor: converts every internal link click into a clean
  // pushState navigation (no page reload, no "#" in the address bar).
  // Handles BOTH legacy "#/…" hrefs and clean "/…" hrefs. Real asset/API
  // paths, new-tab links and downloads are left to the browser.
  useEffect(() => {
    const isSpaPath = (href: string) =>
      href.startsWith("#/") ||
      (href.startsWith("/") &&
        !href.startsWith("//") &&
        !/^(\/api\/|\/uploads\/|\/images\/|\/_next\/|\/favicon|\/logo|\/robots|\/sitemap)/i.test(href));
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || !isSpaPath(href) || href === "/") {
        // "/" (home) is handled by the anchor's own navigate() wiring; other
        // non-SPA links fall through to the browser.
        if (href === "/") {
          e.preventDefault();
          navigate("/");
        }
        return;
      }
      e.preventDefault();
      navigate(href.startsWith("#") ? href.slice(1) : href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const isAdmin = route.segments[0] === "admin";

  return isAdmin ? <AdminApp /> : <SiteApp key="site" />;
}
