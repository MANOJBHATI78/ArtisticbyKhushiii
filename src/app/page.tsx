"use client";

import dynamic from "next/dynamic";
import { useHashRoute } from "@/lib/router";

const SiteApp = dynamic(() => import("@/components/site/site-app"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background" role="status" aria-label="Loading website">
      {/* Brand-agnostic ornament so the loading state never shows a stale or duplicated brand name */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px w-10 bg-gold/60" />
        <span className="text-base leading-none text-gold">◆</span>
        <span className="h-px w-10 bg-gold/60" />
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

export default function Page() {
  const route = useHashRoute();

  // NOTE: the root URL intentionally stays clean (no "#") — parseHash("") resolves to home.

  const isAdmin = route.segments[0] === "admin";

  return isAdmin ? <AdminApp /> : <SiteApp key="site" />;
}
