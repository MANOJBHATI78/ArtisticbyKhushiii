import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import SpaShell from "@/components/site/spa-shell";
import { getPathSeo } from "@/lib/path-seo";

/**
 * Server-side route validation + SEO fallback for the SPA.
 *
 * The whole site is a client-rendered SPA served from this one page, so by
 * default ANY unknown URL returned 200 + a bare loading spinner — a "soft
 * 404" Google flags in Search Console. This server component:
 *
 *  1. Redirects the two duplicate legacy URLs (/page/about, /page/services).
 *  2. Checks the real URL path (forwarded by src/proxy.ts in "x-abk-path")
 *     against the SPA's known route map → notFound() for everything else
 *     (genuine 404 status + the branded 404 page).
 *  3. Renders a real content block (logo + h1 + description, entity image)
 *     into the RAW HTML for indexable routes — so crawlers and slow
 *     connections see meaningful content immediately instead of only the
 *     "Preparing handcrafted goodness…" spinner (the reason Google's live
 *     test rejected indexing requests on slow API responses). The SPA
 *     removes this block as soon as it mounts (see site-app.tsx).
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
  const p = path.split("?")[0].replace(/\/+$/, "");
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

/** "Resin Nameplates | Artistic by Khushiii" → "Resin Nameplates" */
function headingFromTitle(title: string): string {
  return title.replace(/\s*\|\s*Artistic by Khushiii\s*$/i, "").trim() || title;
}

function absoluteImage(src: string | undefined, siteUrl: string): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  return `${siteUrl}${src.startsWith("/") ? "" : "/"}${src}`;
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

  // ---- SSR content fallback (raw-HTML visible) for indexable routes ----
  // Shared cached lookup — the same DB roundtrip generateMetadata() used.
  const { seo, siteUrl, defaultTitle, defaultDescription } = await getPathSeo();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const indexable = !isAdmin && (!seo || !seo.noindex);

  const fallbackBlock =
    indexable && seo ? (
      <div
        id="abk-ssr-fallback"
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-16 text-center"
      >
        <img
          src="/images/logo.png"
          alt="Artistic by Khushiii"
          width={88}
          height={88}
          className="h-22 w-22 object-contain"
        />
        {seo.ogImage ? (
          <img
            src={absoluteImage(seo.ogImage, siteUrl)}
            alt={headingFromTitle(seo.title)}
            width={640}
            height={420}
            className="max-h-72 w-auto max-w-full rounded-2xl object-cover shadow-sm border border-espresso/10"
          />
        ) : null}
        <h1 className="font-display text-3xl sm:text-4xl text-espresso max-w-2xl leading-tight">
          {headingFromTitle(seo.title)}
        </h1>
        <p className="text-muted-foreground max-w-xl leading-relaxed">{seo.description}</p>
        <p className="text-sm text-muted-foreground/70" aria-hidden="true">
          Loading the full experience…
        </p>
      </div>
    ) : indexable && !seo ? (
      // Homepage — brand block while the SPA boots.
      <div
        id="abk-ssr-fallback"
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 py-16 text-center"
      >
        <img
          src="/images/logo.png"
          alt="Artistic by Khushiii"
          width={88}
          height={88}
          className="h-22 w-22 object-contain"
        />
        <h1 className="font-display text-3xl sm:text-4xl text-espresso max-w-2xl leading-tight">
          {headingFromTitle(defaultTitle)}
        </h1>
        <p className="text-muted-foreground max-w-xl leading-relaxed">{defaultDescription}</p>
        <p className="text-sm text-muted-foreground/70" aria-hidden="true">
          Loading the full experience…
        </p>
      </div>
    ) : null;

  return (
    <>
      {fallbackBlock}
      <SpaShell />
    </>
  );
}
