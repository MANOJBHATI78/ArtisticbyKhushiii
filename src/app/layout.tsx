import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import { headers } from "next/headers";
import { cache } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { db } from "@/lib/db";
import { parseCustomCode, schemaPathMatches, type CustomCodeNode } from "@/lib/custom-code";
import { getSettings } from "@/lib/server-utils";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/types";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jost = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

/**
 * Production domain — fallback used when "Site URL" hasn't been filled in the
 * admin settings yet. Keeps sitemap URLs and social-share (OG) tags absolute
 * and therefore valid for Google / WhatsApp / Facebook.
 */
const PRODUCTION_URL = "https://artisticbykhushiii.com";

/** GA4 measurement IDs look like G-ABC1234567. */
const GA_ID_RE = /^G-[A-Z0-9]{6,12}$/i;

/**
 * Google Search Console "HTML tag" method gives a full meta tag; owners often
 * paste the whole tag. Accept: full tag, `google-site-verification=token`,
 * or the bare content token.
 */
function extractGscToken(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const metaContent = t.match(/content\s*=\s*["']([^"']+)["']/i);
  if (metaContent) return metaContent[1].trim();
  const pair = t.match(/google-site-verification\s*=\s*(.+)$/i);
  if (pair) return pair[1].trim();
  return t;
}

/** Normalize an admin-entered site URL (adds https://, strips trailing slashes). */
function normalizeSiteUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

/** Per-request memoised settings read shared by generateMetadata + RootLayout. */
const loadSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await getSettings();
  } catch {
    // Database hiccup — keep the site online with safe defaults
    // (analytics tags simply won't render until the DB is reachable again).
    return DEFAULT_SETTINGS;
  }
});

/**
 * Owner-managed per-page JSON-LD (Admin → Schema Manager). Matched against
 * the current URL path and rendered into the raw HTML — visible in
 * View Source, exactly like Google's crawler reads it.
 */
const loadPageSchemas = cache(async (pathname: string): Promise<string[]> => {
  try {
    const rows = await db.pageSchema.findMany({
      where: { enabled: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows
      .filter((r) => schemaPathMatches(r.path, pathname))
      .map((r) => r.schemaJson)
      .filter((json) => {
        try {
          const parsed = JSON.parse(json);
          return parsed !== null && typeof parsed === "object";
        } catch {
          return false;
        }
      });
  } catch {
    return []; // never let a schema entry take the site down
  }
});

/**
 * Per-URL SEO resolved SERVER-SIDE from the database.
 *
 * Why: the site is a client-rendered SPA, so every deep link used to return the
 * SAME raw HTML (same title, no canonical) — Google treated /category/xyz,
 * /product/xyz etc. as duplicates of the homepage and refused to index them
 * ("Duplicate without user-selected canonical" in Search Console).
 *
 * The proxy (src/proxy.ts) forwards the real URL path in "x-abk-path";
 * generateMetadata() reads it, looks the entity up in the DB and renders a
 * UNIQUE title + description + canonical + og tags for every URL — exactly
 * mirroring the strings the client-side useSeo() applies after hydration.
 */
interface PathSeo {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "article";
  noindex?: boolean;
  keywords?: string[];
}

/** Slug segment used across category/product/blog/page URLs. */
const SLUG = "([a-z0-9-]+)";

async function resolvePathSeo(
  path: string,
  siteUrl: string,
  fallbackTitle: string,
  fallbackDescription: string,
): Promise<PathSeo> {
  const p = path.replace(/\/+$/, "") || "/";
  const fallback = (extra: Partial<PathSeo> = {}): PathSeo => ({
    title: fallbackTitle,
    description: fallbackDescription,
    canonical: `${siteUrl}${p === "/" ? "/" : p}`,
    ...extra,
  });

  // --- Utility / personal routes: useful for users, useless for search. ---
  if (
    p === "/search" ||
    p === "/wishlist" ||
    p === "/thank-you" ||
    p === "/admin" ||
    p.startsWith("/admin/")
  ) {
    return fallback({ noindex: true });
  }

  // --- Listing / static routes (same strings the client views use). ---
  const statics: Record<string, PathSeo> = {
    "/products": {
      title: "All Products | Artistic by Khushiii",
      description:
        "Browse every handcrafted resin creation — nameplates, wall art, trays, coasters, keychains, jewellery and custom gifts, made to order by Artistic by Khushiii.",
      canonical: `${siteUrl}/products`,
    },
    "/categories": {
      title: "Categories | Artistic by Khushiii",
      description:
        "Explore our handcrafted resin art collections — nameplates, mantra frames, wall art, trays, coasters, keychains, jewellery, memory preservation keepsakes and custom orders.",
      canonical: `${siteUrl}/categories`,
    },
    "/blog": {
      title: "Blog | Artistic by Khushiii — Resin Art Journal",
      description:
        "Care guides, design ideas and behind-the-scenes stories from the Artistic by Khushiii resin art studio in Surat.",
      canonical: `${siteUrl}/blog`,
    },
    "/contact": {
      title: "Contact Us | Artistic by Khushiii",
      description:
        "Get in touch with Artistic by Khushiii — call, WhatsApp or send an inquiry. Surat-based resin art studio delivering across India and worldwide.",
      canonical: `${siteUrl}/contact`,
    },
    "/faq": {
      title: "FAQ | Artistic by Khushiii — Frequently Asked Questions",
      description:
        "Answers about ordering, customization, delivery timelines, care instructions and international shipping for handcrafted resin art by Artistic by Khushiii.",
      canonical: `${siteUrl}/faq`,
    },
  };
  if (statics[p]) return statics[p];

  // --- DB-backed fixed pages: /about, /services. ---
  if (p === "/about" || p === "/services") {
    try {
      const page = await db.page.findUnique({ where: { slug: p.slice(1) } });
      if (p === "/about") {
        return {
          title: page?.seoTitle || "About Us | Artistic by Khushiii",
          description:
            page?.metaDescription ||
            "The story of Artistic by Khushiii — a small-batch resin art studio from Surat crafting personalized nameplates, décor and memory keepsakes by hand.",
          canonical: page?.canonicalUrl?.trim() || `${siteUrl}/about`,
        };
      }
      return {
        title: page?.seoTitle || "Our Services | Artistic by Khushiii",
        description:
          page?.metaDescription ||
          "Custom resin art commissions, memory preservation, bulk & corporate gifting and worldwide shipping — services offered by Artistic by Khushiii.",
        canonical: page?.canonicalUrl?.trim() || `${siteUrl}/services`,
      };
    } catch {
      /* fall through to safe defaults below */
    }
  }

  const keywordsFor = (...kw: (string | null | undefined)[]): string[] | undefined => {
    const list = kw.flatMap((k) => (k ?? "").split(",").map((x) => x.trim()).filter(Boolean));
    return list.length > 0 ? list.slice(0, 12) : undefined;
  };

  // --- /category/[slug] ---
  let m = p.match(new RegExp(`^/category/${SLUG}$`, "i"));
  if (m) {
    try {
      const cat = await db.category.findUnique({ where: { slug: m[1] } });
      if (cat) {
        return {
          title: cat.seoTitle || `${cat.name} | Artistic by Khushiii`,
          description: cat.metaDescription || cat.shortDescription || fallbackDescription,
          canonical: cat.canonicalUrl?.trim() || `${siteUrl}/category/${cat.slug}`,
          keywords: keywordsFor(cat.focusKeyword, cat.secondaryKeywords),
        };
      }
    } catch {
      /* DB hiccup — fall back below */
    }
    return fallback({ noindex: true }); // unknown slug → don't index a soft-404
  }

  // --- /product/[slug] ---
  m = p.match(new RegExp(`^/product/${SLUG}$`, "i"));
  if (m) {
    try {
      const prod = await db.product.findUnique({
        where: { slug: m[1] },
        include: { images: { orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }] } },
      });
      if (prod && prod.published) {
        return {
          title: prod.seoTitle || `${prod.name} | Artistic by Khushiii`,
          description: prod.metaDescription || prod.shortDescription || fallbackDescription,
          canonical: prod.canonicalUrl?.trim() || `${siteUrl}/product/${prod.slug}`,
          ogImage: prod.images[0]?.url || undefined,
          keywords: keywordsFor(prod.focusKeyword, prod.secondaryKeywords),
        };
      }
    } catch {
      /* fall back below */
    }
    return fallback({ noindex: true });
  }

  // --- /blog/[slug] ---
  m = p.match(new RegExp(`^/blog/${SLUG}$`, "i"));
  if (m) {
    try {
      const post = await db.blogPost.findUnique({ where: { slug: m[1] } });
      const visible =
        post &&
        (post.status === "PUBLISHED" ||
          (post.status === "SCHEDULED" && post.publishAt && post.publishAt <= new Date()));
      if (post && visible) {
        return {
          title: post.seoTitle || `${post.title} | Artistic by Khushiii`,
          description: post.metaDescription || post.excerpt || fallbackDescription,
          canonical: post.canonicalUrl?.trim() || `${siteUrl}/blog/${post.slug}`,
          ogImage: post.coverImage || undefined,
          ogType: "article",
          keywords: keywordsFor(post.focusKeyword, post.secondaryKeywords),
        };
      }
    } catch {
      /* fall back below */
    }
    return fallback({ noindex: true });
  }

  // --- /page/[slug] (privacy, terms, disclaimer, …) ---
  m = p.match(new RegExp(`^/page/${SLUG}$`, "i"));
  if (m) {
    try {
      const page = await db.page.findUnique({ where: { slug: m[1] } });
      if (page) {
        return {
          title: page.seoTitle || `${page.title} | Artistic by Khushiii`,
          description: page.metaDescription || fallbackDescription,
          canonical: page.canonicalUrl?.trim() || `${siteUrl}/page/${page.slug}`,
        };
      }
    } catch {
      /* fall back below */
    }
    return fallback({ noindex: true });
  }

  // --- /lp/[slug] (landing pages) ---
  m = p.match(new RegExp(`^/lp/${SLUG}$`, "i"));
  if (m) {
    try {
      const lp = await db.landingPage.findUnique({ where: { slug: m[1] } });
      if (lp) {
        return {
          title: lp.metaTitle || `${lp.title} | Artistic by Khushiii`,
          description: lp.metaDescription || lp.subheadline || lp.llmSummary || fallbackDescription,
          canonical: lp.canonicalUrl?.trim() || `${siteUrl}/lp/${lp.slug}`,
          ogImage: lp.ogImageUrl || lp.heroImageUrl || undefined,
          noindex: lp.noindex || undefined,
        };
      }
    } catch {
      /* fall back below */
    }
    return fallback({ noindex: true });
  }

  // --- Anything else renders the 404 view → keep it out of the index. ---
  return fallback({ title: "Page Not Found | Artistic by Khushiii", noindex: true });
}

export async function generateMetadata(): Promise<Metadata> {
  // Current URL path (set by src/proxy.ts) — drives the per-page SEO below.
  const h = await headers();
  const pathname = (h.get("x-abk-path") || "/").split("?")[0];

  const s = await loadSettings();

  const siteUrl = normalizeSiteUrl(s.siteUrl) || PRODUCTION_URL;
  const defaultTitle =
    s.defaultSeoTitle.trim() ||
    "Artistic by Khushiii | Handcrafted Personalized Resin Art & Gifts";
  const defaultDescription =
    s.defaultMetaDescription.trim() ||
    "Discover handcrafted resin nameplates, wall art, trays, coasters, keychains, jewellery and memory preservation keepsakes by Artistic by Khushiii. Personalized designs made with love. Enquire on WhatsApp.";
  const ogImage = s.defaultOgImage.trim() || "/images/og-default.jpg";
  const gscToken = extractGscToken(s.googleSearchConsoleToken);

  // Homepage keeps the owner's default SEO; every other path gets unique
  // server-rendered title/description/canonical from the database.
  const seo =
    pathname === "/"
      ? null
      : await resolvePathSeo(pathname, siteUrl, defaultTitle, defaultDescription);

  const title = seo?.title || defaultTitle;
  const description = seo?.description || defaultDescription;
  const finalOgImage = seo?.ogImage || ogImage;
  const canonical = seo?.canonical || `${siteUrl}/`;

  const metadata: Metadata = {
    title: {
      default: title,
      template: "%s | Artistic by Khushiii",
    },
    description,
    keywords:
      seo?.keywords ??
      [
        "resin art", "personalized resin nameplate", "resin nameplate India", "memory preservation",
        "resin gifts", "handcrafted resin art", "Lippan art", "custom resin art", "resin coasters", "resin tray",
      ],
    authors: [{ name: "Khushi" }],
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/images/logo.png", type: "image/png" },
      ],
      apple: "/images/apple-touch-icon.png",
    },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      siteName: "Artistic by Khushiii",
      type: seo?.ogType === "article" ? "article" : "website",
      images: [{ url: finalOgImage, width: 1200, height: 630 }],
    },
    robots: seo?.noindex ? { index: false, follow: true } : { index: true, follow: true },
  };

  try {
    metadata.metadataBase = new URL(siteUrl);
  } catch {
    /* invalid URL — fall back to relative tags (same as before) */
  }
  // Search Console verification via the "HTML tag" method — server-rendered so
  // it is visible in View Source and picked up by Google's verification crawler.
  if (gscToken) metadata.verification = { google: gscToken };

  return metadata;
}

/**
 * Standard GA4 bootstrap — SERVER-RENDERED so the tag is visible in
 * "View Source" and starts collecting even before the SPA boots.
 * page_view itself is sent by the SPA router (components/site/analytics.tsx),
 * so send_page_view is disabled here to avoid double counting. Localhost and
 * the /admin console never send data.
 */
function gaBootstrap(gaId: string): string {
  return (
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());" +
    "if(!/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)&&!/^\\/admin(\\/|$)/.test(location.pathname)){" +
    `gtag('config','${gaId}',{send_page_view:false});}`
  );
}

/** React expects camelCase for a handful of HTML attributes. */
const ATTR_RENAMES: Record<string, string> = {
  charset: "charSet",
  class: "className",
  "http-equiv": "httpEquiv",
  crossorigin: "crossOrigin",
  referrerpolicy: "referrerPolicy",
  acceptcharset: "acceptCharset",
};

function reactAttrs(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    out[ATTR_RENAMES[k] ?? k] = v;
  }
  return out;
}

/**
 * Renders the owner's custom code snippet (parsed from raw HTML) as React
 * nodes. React 19 hoists <meta>/<link>/<title> into <head> automatically;
 * scripts execute where they render (body end — exactly how the GA tag works).
 */
function CustomCodeNodes({ nodes }: { nodes: CustomCodeNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.kind) {
          case "meta":
            return <meta key={i} {...reactAttrs(n.attrs)} />;
          case "link":
            return <link key={i} {...reactAttrs(n.attrs)} />;
          case "script-src":
            return <script key={i} {...reactAttrs(n.attrs)} async />;
          case "script-inline":
            return <script key={i} {...reactAttrs(n.attrs)} dangerouslySetInnerHTML={{ __html: n.content }} />;
          case "style":
            return <style key={i} dangerouslySetInnerHTML={{ __html: n.content }} />;
          case "title":
            return <title key={i}>{n.content}</title>;
          case "noscript":
            return <noscript key={i} dangerouslySetInnerHTML={{ __html: n.content }} />;
          default:
            return null;
        }
      })}
    </>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Current URL path (set by src/middleware.ts) — drives the per-page schemas.
  const h = await headers();
  const pathname = (h.get("x-abk-path") || "/").split("?")[0];

  const s = await loadSettings();
  const schemaJsons = await loadPageSchemas(pathname);

  const gaId = s.googleAnalyticsId.trim();
  const gaLive = GA_ID_RE.test(gaId);
  const headNodes = parseCustomCode(s.customHeadCode);
  const bodyNodes = parseCustomCode(s.customBodyCode);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfair.variable} ${jost.variable} antialiased bg-background text-foreground`}>
        {children}

        {/* Owner's custom code — Admin → Site Settings → Custom Code.
            Server-rendered (View Source visible) so verification meta tags,
            GTM snippets, pixels and chat widgets work for every crawler. */}
        <CustomCodeNodes nodes={headNodes} />
        <CustomCodeNodes nodes={bodyNodes} />

        {/* Owner's per-page JSON-LD — Admin → Schema Manager (server-rendered). */}
        {schemaJsons.map((json, i) => (
          <script key={`ps-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
        ))}

        {gaLive && (
          <>
            {/* Google Analytics 4 — rendered on the server (View Source visible) */}
            <script
              id="abk-ga-script"
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <script dangerouslySetInnerHTML={{ __html: gaBootstrap(gaId) }} />
          </>
        )}
        <Toaster />
      </body>
    </html>
  );
}
