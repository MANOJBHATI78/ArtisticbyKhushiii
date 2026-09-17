"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Lightweight hash-based router for the single-page app.
 * Routes:
 *   #/                        Home
 *   #/products                All products (with ?category=slug&q=)
 *   #/product/[slug]          Product detail
 *   #/categories              All categories
 *   #/category/[slug]         Category page
 *   #/blog                    Blog index
 *   #/blog/[slug]             Blog post
 *   #/about #/contact #/faq #/services
 *   #/page/[slug]             Dynamic pages (privacy, terms…)
 *   #/search?q=               Search results
 *   #/thank-you
 *   #/admin/...               Admin panel
 */

export interface Route {
  path: string;      // e.g. "/product/personalized-resin-nameplate"
  segments: string[];// ["product", "personalized-resin-nameplate"]
  query: URLSearchParams;
  hash: string;      // full "#/product/...?q=1"
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return {
    path,
    segments: path.split("/").filter(Boolean),
    query: new URLSearchParams(queryPart || ""),
    hash,
  };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined"
      ? { path: "/", segments: [], query: new URLSearchParams(), hash: "" }
      : parseHash(window.location.hash)
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

export function navigate(to: string, opts?: { replace?: boolean; keepScroll?: boolean }) {
  const target = to.startsWith("#") ? to : `#${to.startsWith("/") ? to : `/${to}`}`;
  // Home = clean root URL (no trailing #) so the address bar stays tidy on the homepage
  if (target === "#" || target === "#/") {
    if (window.location.hash) {
      // Moving from an inner page back to home — push a clean history entry and drop the hash
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else if (opts?.replace) {
    const url = `${window.location.pathname}${window.location.search}${target}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else if (window.location.hash === target) {
    // same route — force re-render
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = target;
  }
  if (!opts?.keepScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}
