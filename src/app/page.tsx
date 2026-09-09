"use client";

import dynamic from "next/dynamic";
import { useHashRoute } from "@/lib/router";
import { useEffect } from "react";

const SiteApp = dynamic(() => import("@/components/site/site-app"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <div className="font-display text-2xl text-primary">Artistic by Khushi</div>
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

  // Ensure a default route exists
  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}#/`);
    }
  }, []);

  const isAdmin = route.segments[0] === "admin";

  return isAdmin ? <AdminApp /> : <SiteApp key="site" />;
}
