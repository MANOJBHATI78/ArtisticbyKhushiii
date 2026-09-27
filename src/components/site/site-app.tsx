"use client";

import { useEffect, useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { InquiryModal } from "@/components/site/inquiry-modal";
import { LeadGateDialog } from "@/components/site/lead-gate";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { BackToTop } from "@/components/site/back-to-top";
import { SiteAnalytics } from "@/components/site/analytics";
import HomeView from "@/components/views/home-view";
import ProductsView from "@/components/views/products-view";
import ProductView from "@/components/views/product-view";
import CategoriesView from "@/components/views/categories-view";
import CategoryView from "@/components/views/category-view";
import BlogView from "@/components/views/blog-view";
import BlogPostView from "@/components/views/blog-post-view";
import AboutView from "@/components/views/about-view";
import ServicesView from "@/components/views/services-view";
import ContactView from "@/components/views/contact-view";
import FaqView from "@/components/views/faq-view";
import SearchView from "@/components/views/search-view";
import ThankYouView from "@/components/views/thank-you-view";
import NotFoundView from "@/components/views/not-found-view";
import GenericPageView from "@/components/views/page-view";
import LandingView from "@/components/views/landing-view";
import WishlistView from "@/components/views/wishlist-view";
import { useSettings } from "@/lib/queries";
import { useHashRoute } from "@/lib/router";
import { useSiteStore } from "@/lib/store";

/** Reads UTM params from the page URL (before the hash) once, then persists them for the lead form. */
function useUtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const map: Record<string, string> = {
        utm_source: "abk_utm_source",
        utm_medium: "abk_utm_medium",
        utm_campaign: "abk_utm_campaign",
      };
      for (const [param, storageKey] of Object.entries(map)) {
        const value = params.get(param);
        if (value) sessionStorage.setItem(storageKey, value);
      }
    } catch {
      /* storage unavailable — carry on */
    }
  }, []);
}

/** wa.me links that address a phone number (share links like wa.me/?text=… have NO digits and stay untouched). */
const WHATSAPP_HREF_RE = /^https:\/\/wa\.me\/\d+/;

/**
 * WhatsApp / call lead gate — every wa.me/<number> and tel: tap is intercepted
 * (capture phase, so we beat target=_blank) and asked for name + mobile before
 * the visitor is connected. Modifier-clicks (ctrl/cmd/shift/alt) open the raw
 * link for power users. Product context rides along via data-lead-* attributes.
 */
function useLeadGateInterceptor() {
  const openLeadGate = useSiteStore((s) => s.openLeadGate);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      let kind: "whatsapp" | "call" | null = null;
      if (WHATSAPP_HREF_RE.test(href)) kind = "whatsapp";
      else if (href.startsWith("tel:")) kind = "call";
      if (!kind) return;
      e.preventDefault();
      e.stopPropagation();
      openLeadGate(href, kind, {
        product: a.dataset.leadProduct,
        productUrl: a.dataset.leadProductUrl,
        category: a.dataset.leadCategory,
      });
    };
    // CAPTURE phase — runs before the anchor's own handlers and any bubble-phase
    // listeners, and before the browser honours target="_blank".
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [openLeadGate]);
}

/** Scrolls to top when the path (not query) changes. */
function useScrollTop(path: string) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [path]);
}

function resolveView(route: ReturnType<typeof useHashRoute>) {
  const [root, param] = route.segments;

  switch (root) {
    case undefined:
    case "":
      return <HomeView />;
    case "products":
      return <ProductsView />;
    case "product":
      return param ? <ProductView key={param} slug={param} /> : <NotFoundView />;
    case "categories":
      return <CategoriesView />;
    case "category":
      return param ? <CategoryView key={param} slug={param} /> : <NotFoundView />;
    case "blog":
      return param ? <BlogPostView key={param} slug={param} /> : <BlogView />;
    case "about":
      return <AboutView />;
    case "services":
      return <ServicesView />;
    case "contact":
      return <ContactView />;
    case "faq":
      return <FaqView />;
    case "page":
      return param ? <GenericPageView key={param} slug={param} /> : <NotFoundView />;
    case "lp":
      return param ? <LandingView key={param} slug={param} /> : <NotFoundView />;
    case "search":
      return <SearchView />;
    case "wishlist":
      return <WishlistView />;
    case "thank-you":
      return <ThankYouView />;
    default:
      return <NotFoundView />;
  }
}

/**
 * Inner shell — must be rendered INSIDE <Providers> so React Query
 * hooks (settings, categories, …) have a QueryClient context.
 */
function SiteShell() {
  const route = useHashRoute();
  const { data: settings } = useSettings();
  const setSettings = useSiteStore((s) => s.setSettings);

  // Remove the server-rendered SEO fallback block BEFORE the browser paints —
  // the real SPA content takes over (raw-HTML crawlers keep the fallback).
  useLayoutEffect(() => {
    document.getElementById("abk-ssr-fallback")?.remove();
  }, []);

  useEffect(() => {
    if (settings) setSettings(settings);
  }, [settings, setSettings]);

  useUtmCapture();
  useScrollTop(route.path);
  useLeadGateInterceptor();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {/* Keyed on the route path → re-mounts on every SPA navigation and
            replays a gentle fade-and-rise (CSS only, reduced-motion aware). */}
        <div key={route.path} className="page-transition">
          {resolveView(route)}
        </div>
      </main>
      <SiteFooter />
      <InquiryModal />
      <LeadGateDialog />
      <WhatsAppFloat />
      <BackToTop />
      {/* GA4 / Search Console / MS Clarity — injected only when configured in admin settings. */}
      {settings ? <SiteAnalytics settings={settings} /> : null}
      <Toaster />
    </div>
  );
}

/**
 * Public website application — rendered for every route except #/admin*.
 * Views are resolved by the hash router (see src/lib/router.ts).
 */
export default function SiteApp() {
  return (
    <Providers>
      <SiteShell />
    </Providers>
  );
}
