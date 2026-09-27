import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import SpaShell from "@/components/site/spa-shell";

/**
 * Server-side route validation for the SPA.
 *
 * The whole site is a client-rendered SPA served from one page, so by default
 * ANY unknown URL returned 200 + the homepage HTML — a "soft 404" that Google
 * flags in Search Console. This server component checks the real URL path
 * (forwarded by src/proxy.ts in "x-abk-path") against the SPA's known route
 * map and throws notFound() for everything else → genuine 404 status code
 * with the branded 404 page (src/app/not-found.tsx).
 *
 * The route list below mirrors src/components/site/site-app.tsx exactly.
 */
const STATIC_ROUTES = new Set([
  "products",
  "categories",
  "blog",
  "about",
  "services",
  "contact",
  "faq",
  "search",
  "wishlist",
  "thank-you",
]);

/** Routes rendered as /[root]/[slug] by the SPA router. */
const PARAM_ROUTES = new Set(["product", "category", "blog", "page", "lp"]);

/** One URL segment: non-empty, no slashes (query string already stripped). */
const SEGMENT_RE = /^[^/]+$/;

function isKnownSpaRoute(path: string): boolean {
  // Normalise: strip trailing slashes + leading slash, drop query.
  let p = path.split("?")[0].replace(/\/+$/, "");
  if (p === "" || p === "/") return true; // homepage

  const segments = p.replace(/^\//, "").split("/");
  const [root, param] = segments;

  // /admin and /admin/… → the studio console (client-rendered login).
  if (root === "admin") return true;

  if (segments.length === 1) return STATIC_ROUTES.has(root.toLowerCase());

  if (segments.length === 2 && SEGMENT_RE.test(param)) {
    return PARAM_ROUTES.has(root.toLowerCase());
  }

  return false;
}

export default async function Page() {
  const h = await headers();
  const pathname = h.get("x-abk-path") || "/";

  // /page/about and /page/services duplicate the dedicated /about and
  // /services routes — permanently redirect instead of serving duplicates.
  const p = pathname.split("?")[0].replace(/\/+$/, "");
  if (p === "/page/about") permanentRedirect("/about");
  if (p === "/page/services") permanentRedirect("/services");

  if (!isKnownSpaRoute(pathname)) {
    // Genuine 404 — correct HTTP status for crawlers, branded page for people.
    notFound();
  }

  return <SpaShell />;
}
