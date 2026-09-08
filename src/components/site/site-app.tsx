"use client";

import { useHashRoute } from "@/lib/router";
import { useSettings } from "@/lib/queries";
import { useSiteStore } from "@/lib/store";
import { useEffect } from "react";
import HomeView from "@/components/views/home-view";
import { Providers } from "@/components/providers";

/**
 * Public website application — rendered for every route except #/admin*.
 * Views are resolved by the hash router (see src/lib/router.ts).
 */
export default function SiteApp() {
  const route = useHashRoute();
  const { data: settings } = useSettings();
  const setSettings = useSiteStore((s) => s.setSettings);

  useEffect(() => {
    if (settings) setSettings(settings);
  }, [settings, setSettings]);

  return (
    <Providers>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          <HomeView />
        </main>
        {/* Task 3-a: full view router with SiteHeader / SiteFooter / WhatsAppFloat / InquiryModal + all views */}
        {/* current route: {route.path} */}
      </div>
    </Providers>
  );
}
