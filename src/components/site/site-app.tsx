"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { InquiryModal } from "@/components/site/inquiry-modal";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
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
    case "search":
      return <SearchView />;
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

  useEffect(() => {
    if (settings) setSettings(settings);
  }, [settings, setSettings]);

  useUtmCapture();
  useScrollTop(route.path);

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
        {resolveView(route)}
      </main>
      <SiteFooter />
      <InquiryModal />
      <WhatsAppFloat />
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
