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
import { getPathSeo, normalizeSiteUrl } from "@/lib/path-seo";

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

export async function generateMetadata(): Promise<Metadata> {
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
  // server-rendered title/description/canonical from the database (shared
  // cached lookup — same roundtrip as the page's SSR fallback block).
  const { seo } = await getPathSeo();

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
