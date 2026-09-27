import { cache } from "react";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/server-utils";

/**
 * Per-URL SEO resolved SERVER-SIDE from the database.
 *
 * Why: the site is a client-rendered SPA, so every deep link used to return the
 * SAME raw HTML (same title, no canonical) — Google treated /category/xyz,
 * /product/xyz etc. as duplicates of the homepage and refused to index them
 * ("Duplicate without user-selected canonical" in Search Console).
 *
 * The proxy (src/proxy.ts) forwards the real URL path in "x-abk-path";
 * getPathSeo() looks the entity up in the DB and returns a UNIQUE title +
 * description + canonical + og tags for every URL — exactly mirroring the
 * strings the client-side useSeo() applies after hydration.
 *
 * Wrapped in React cache(): generateMetadata (layout) and the SSR fallback
 * block (page) share ONE database roundtrip per request.
 */
export interface PathSeo {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "article";
  noindex?: boolean;
  keywords?: string[];
}

export const PRODUCTION_URL = "https://artisticbykhushiii.com";

export function normalizeSiteUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
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
          canonical: `${siteUrl}/about`,
        };
      }
      return {
        title: page?.seoTitle || "Our Services | Artistic by Khushiii",
        description:
          page?.metaDescription ||
          "Custom resin art commissions, memory preservation, bulk & corporate gifting and worldwide shipping — services offered by Artistic by Khushiii.",
        canonical: `${siteUrl}/services`,
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
    // /page/about and /page/services 301-redirect to their dedicated routes —
    // canonicalise defensively in case a redirect is ever bypassed.
    if (m[1].toLowerCase() === "about") {
      return {
        title: "About Us | Artistic by Khushiii",
        description: fallbackDescription,
        canonical: `${siteUrl}/about`,
      };
    }
    if (m[1].toLowerCase() === "services") {
      return {
        title: "Our Services | Artistic by Khushiii",
        description: fallbackDescription,
        canonical: `${siteUrl}/services`,
      };
    }
    try {
      const page = await db.page.findUnique({ where: { slug: m[1] } });
      if (page) {
        return {
          title: page.seoTitle || `${page.title} | Artistic by Khushiii`,
          description: page.metaDescription || fallbackDescription,
          canonical: `${siteUrl}/page/${page.slug}`,
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

/**
 * Request-level cached SEO for the current URL. Reads the path from the
 * "x-abk-path" request header (set by src/proxy.ts) and resolves settings +
 * entity data ONCE per request (shared by layout metadata + page SSR block).
 */
export const getPathSeo = cache(
  async (): Promise<{
    pathname: string;
    siteUrl: string;
    defaultTitle: string;
    defaultDescription: string;
    seo: PathSeo | null; // null on the homepage (uses defaults)
  }> => {
    const h = await headers();
    const pathname = (h.get("x-abk-path") || "/").split("?")[0];

    let siteUrl = PRODUCTION_URL;
    let defaultTitle = "Artistic by Khushiii | Handcrafted Personalized Resin Art & Gifts";
    let defaultDescription =
      "Discover handcrafted resin nameplates, wall art, trays, coasters, keychains, jewellery and memory preservation keepsakes by Artistic by Khushiii. Personalized designs made with love. Enquire on WhatsApp.";
    try {
      const s = await getSettings();
      siteUrl = normalizeSiteUrl(s.siteUrl) || PRODUCTION_URL;
      defaultTitle = s.defaultSeoTitle.trim() || defaultTitle;
      defaultDescription = s.defaultMetaDescription.trim() || defaultDescription;
    } catch {
      /* DB hiccup — keep built-in defaults */
    }

    const seo = pathname === "/" ? null : await resolvePathSeo(pathname, siteUrl, defaultTitle, defaultDescription);
    return { pathname, siteUrl, defaultTitle, defaultDescription, seo };
  },
);
