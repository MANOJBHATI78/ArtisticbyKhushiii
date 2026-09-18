"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight client router for the single-page app.
 *
 * URLs are CLEAN PATHS — /products, /product/slug, /blog — no "#" in the
 * address bar (served by the catch-all rewrite in next.config.ts).
 *
 * Legacy "#/..." links still work everywhere:
 *  - old bookmarks / shared links load via the hash and get rewritten to the
 *    clean path immediately
 *  - in-app <a href="#/..."> clicks are intercepted globally (see page.tsx)
 *    and converted to clean pushState navigations
 *
 * Routes:
 *   /                        Home
 *   /products                All products (with ?category=slug&q=)
 *   /product/[slug]          Product detail
 *   /categories              All categories
 *   /category/[slug]         Category page
 *   /blog                    Blog index
 *   /blog/[slug]             Blog post
 *   /about /contact /faq /services
 *   /page/[slug]             Dynamic pages (privacy, terms…)
 *   /search?q=               Search results
 *   /lp/[slug]               Landing pages
 *   /thank-you
 *   /admin/...               Admin panel
 */

export interface Route {
  path: string;      // e.g. "/product/personalized-resin-nameplate"
  segments: string[];// ["product", "personalized-resin-nameplate"]
  query: URLSearchParams;
  hash: string;      // legacy hash if the URL was loaded as "#/..." (kept for compat)
}

function buildRoute(path: string, query: string, hash = ""): Route {
  const p = path.startsWith("/") ? path : `/${path}`;
  return {
    path: p,
    segments: p.split("/").filter(Boolean),
    query: new URLSearchParams(query),
    hash,
  };
}

function readRoute(): Route {
  const { pathname, search, hash } = window.location;
  // Legacy hash URL: "/#/products?q=x" (old bookmark or shared link)
  if (hash.startsWith("#/") && (pathname === "/" || pathname === "")) {
    const raw = hash.slice(1);
    const [p, q] = raw.split("?");
    return buildRoute(p || "/", q || "", hash);
  }
  return buildRoute(pathname || "/", search.replace(/^\?/, ""));
}

/** Client route hook — pathname-first with legacy "#/…" hash fallback. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined"
      ? { path: "/", segments: [], query: new URLSearchParams(), hash: "" }
      : readRoute()
  );

  useEffect(() => {
    // Normalize a legacy hash URL to the clean path right away so the
    // address bar never keeps the "#/…" form.
    const { pathname, hash } = window.location;
    if (hash.startsWith("#/") && (pathname === "/" || pathname === "")) {
      const clean = hash.slice(1);
      window.history.replaceState(null, "", clean === "/" ? "/" : clean);
    }
    const update = () => setRoute(readRoute());
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);

  return route;
}

export function navigate(to: string, opts?: { replace?: boolean; keepScroll?: boolean }) {
  // Accepts "/products", "products" or legacy "#/products" — always navigates
  // to the CLEAN path via pushState/replaceState (no page reload, no "#").
  let target = to.startsWith("#") ? to.slice(1) : to;
  if (!target.startsWith("/")) target = `/${target}`;
  if (opts?.replace) {
    window.history.replaceState(null, "", target);
  } else {
    window.history.pushState(null, "", target);
  }
  // pushState/replaceState don't fire any event — notify the route listeners.
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (!opts?.keepScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}
