// ============================================================
// Artistic by Khushi — Shared server-side serializers
// Maps Prisma rows → the exact Public* types in src/lib/types.ts.
// Used by all public API routes and admin list endpoints.
// ============================================================

import type {
  AdminLandingPage,
  Faq,
  LandingFaqItem,
  Lead,
  MediaAsset,
  PublicBlogPost,
  PublicCategory,
  PublicPage,
  PublicProduct,
  Testimonial,
} from "@/lib/types";

type PrismaProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  subcategory: string;
  shortDescription: string;
  longDescription: string;
  highlights: string;
  customizationOptions: string;
  size: string;
  material: string;
  colour: string;
  occasion: string;
  careInstructions: string;
  tags: string;
  featured: boolean;
  published: boolean;
  displayOrder: number;
  relatedProductIds: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  createdAt: Date;
  updatedAt: Date;
  images?: {
    id: string;
    url: string;
    alt: string;
    caption: string;
    isFeatured: boolean;
    displayOrder: number;
  }[];
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

/** Featured image = isFeatured true, else lowest displayOrder, else nothing. */
function pickFeaturedImage(images: { url: string; alt: string; isFeatured: boolean; displayOrder: number }[]) {
  if (!images || images.length === 0) return { url: "", alt: "" };
  const sorted = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
  const chosen = sorted.find((img) => img.isFeatured) ?? sorted[0];
  return { url: chosen.url, alt: chosen.alt };
}

/** Serialize a Product row (with images + category included) → PublicProduct. */
export function toPublicProduct(
  p: PrismaProduct,
): PublicProduct {
  const images = (p.images ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder);
  const featured = pickFeaturedImage(images);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? "",
    categorySlug: p.category?.slug ?? "",
    subcategory: p.subcategory,
    shortDescription: p.shortDescription,
    longDescription: p.longDescription,
    highlights: p.highlights,
    customizationOptions: p.customizationOptions,
    size: p.size,
    material: p.material,
    colour: p.colour,
    occasion: p.occasion,
    careInstructions: p.careInstructions,
    tags: p.tags,
    featured: p.featured,
    published: p.published,
    displayOrder: p.displayOrder,
    relatedProductIds: p.relatedProductIds,
    featuredImageUrl: featured.url,
    featuredImageAlt: featured.alt,
    gallery: images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      caption: img.caption,
      isFeatured: img.isFeatured,
      displayOrder: img.displayOrder,
    })),
    seoTitle: p.seoTitle,
    metaDescription: p.metaDescription,
    focusKeyword: p.focusKeyword,
    secondaryKeywords: p.secondaryKeywords,
    ogTitle: p.ogTitle,
    ogDescription: p.ogDescription,
    canonicalUrl: p.canonicalUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

type PrismaCategory = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  imageUrl: string;
  mobileImageUrl: string;
  imageAlt: string;
  introContent: string;
  bottomContent: string;
  featured: boolean;
  displayOrder: number;
  parentId: string | null;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
};

/** Serialize a Category row → PublicCategory (productCount supplied by caller). */
export function toPublicCategory(c: PrismaCategory, productCount: number): PublicCategory {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    shortDescription: c.shortDescription,
    longDescription: c.longDescription,
    imageUrl: c.imageUrl,
    mobileImageUrl: c.mobileImageUrl ?? "",
    imageAlt: c.imageAlt,
    introContent: c.introContent,
    bottomContent: c.bottomContent,
    featured: c.featured,
    displayOrder: c.displayOrder,
    parentId: c.parentId,
    productCount,
    seoTitle: c.seoTitle,
    metaDescription: c.metaDescription,
    focusKeyword: c.focusKeyword,
    secondaryKeywords: c.secondaryKeywords,
    ogTitle: c.ogTitle,
    ogDescription: c.ogDescription,
    canonicalUrl: c.canonicalUrl,
  };
}

type PrismaBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverAlt: string;
  author: string;
  readingTime: number;
  tags: string;
  featured: boolean;
  status: string;
  publishAt: Date | null;
  publishedAt: Date | null;
  relatedProductSlugs: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  createdAt: Date;
  updatedAt: Date;
  blogCategory?: { id: string; name: string; slug: string } | null;
};

/** Serialize a BlogPost row (with blogCategory included) → PublicBlogPost. */
export function toPublicBlogPost(p: PrismaBlogPost): PublicBlogPost {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: p.coverImage,
    coverAlt: p.coverAlt,
    author: p.author,
    readingTime: p.readingTime,
    tags: p.tags,
    featured: p.featured,
    status: p.status,
    publishAt: p.publishAt ? p.publishAt.toISOString() : null,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    blogCategoryName: p.blogCategory?.name ?? null,
    blogCategorySlug: p.blogCategory?.slug ?? null,
    relatedProductSlugs: p.relatedProductSlugs,
    seoTitle: p.seoTitle,
    metaDescription: p.metaDescription,
    focusKeyword: p.focusKeyword,
    secondaryKeywords: p.secondaryKeywords,
    ogTitle: p.ogTitle,
    ogDescription: p.ogDescription,
    canonicalUrl: p.canonicalUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Serialize a Page row → PublicPage. */
export function toPublicPage(p: {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  seoTitle: string;
  metaDescription: string;
}): PublicPage {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    content: p.content,
    published: p.published,
    seoTitle: p.seoTitle,
    metaDescription: p.metaDescription,
  };
}

// ---------------- landing pages ----------------

type PrismaLandingPage = Omit<AdminLandingPage, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

/** Serialize a LandingPage row → AdminLandingPage (string dates). */
export function toLanding(l: PrismaLandingPage): AdminLandingPage {
  return {
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

/** faqsJson → validated [{question, answer}] (bad entries dropped). */
export function parseLandingFaqs(raw: string): LandingFaqItem[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object" && !Array.isArray(f))
      .map((f) => ({ question: String(f.question ?? "").trim(), answer: String(f.answer ?? "").trim() }))
      .filter((f) => f.question && f.answer);
  } catch {
    return [];
  }
}

/** productIds / categoryIds JSON string → string[] (deduped, order preserved). */
export function parseIdList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    const ids: string[] = [];
    for (const v of parsed) {
      const id = typeof v === "string" ? v.trim() : "";
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

/** Serialize a Faq row → Faq. */
export function toFaq(f: {
  id: string;
  question: string;
  answer: string;
  entityType: string;
  entityId: string | null;
  displayOrder: number;
  published: boolean;
}): Faq {
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
    entityType: f.entityType,
    entityId: f.entityId,
    displayOrder: f.displayOrder,
    published: f.published,
  };
}

/** Serialize a Lead row → Lead. */
export function toLead(l: {
  id: string;
  name: string;
  mobile: string;
  city: string;
  product: string;
  productUrl: string;
  category: string;
  message: string;
  preferredContact: string;
  sourcePage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  referrer: string;
  status: string;
  notes: string;
  sheetSynced: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Lead {
  return {
    id: l.id,
    name: l.name,
    mobile: l.mobile,
    city: l.city,
    product: l.product,
    productUrl: l.productUrl,
    category: l.category,
    message: l.message,
    preferredContact: l.preferredContact,
    sourcePage: l.sourcePage,
    utmSource: l.utmSource,
    utmMedium: l.utmMedium,
    utmCampaign: l.utmCampaign,
    referrer: l.referrer,
    status: l.status,
    notes: l.notes,
    sheetSynced: l.sheetSynced,
    createdAt: l.createdAt.toISOString(),
  };
}

/** Serialize a MediaAsset row → MediaAsset. */
export function toMediaAsset(m: {
  id: string;
  url: string;
  filename: string;
  alt: string;
  caption: string;
  title: string;
  size: number;
  createdAt: Date;
}): MediaAsset {
  return {
    id: m.id,
    url: m.url,
    filename: m.filename,
    alt: m.alt,
    caption: m.caption,
    title: m.title,
    size: m.size,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Clamp + resolve pagination query params shared by list endpoints. */
export function pagination(searchParams: URLSearchParams, defaultPageSize = 12, maxPageSize = 48) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const rawSize = parseInt(searchParams.get("pageSize") || String(defaultPageSize), 10) || defaultPageSize;
  const pageSize = Math.min(Math.max(1, rawSize), maxPageSize);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Build a Paginated envelope. */
export function paginated<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// ---------------- Generic request/body coercion helpers ----------------

/** Safely read a JSON object body; returns null if not a JSON object. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

/** Coerce to a trimmed string. */
export function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();
}

/** Trimmed string; empty → null (for nullable FK / date fields). */
export function strOrNull(v: unknown): string | null {
  const s = str(v);
  return s === "" ? null : s;
}

/** Coerce boolean-ish values ("true"/true) with a fallback default. */
export function bool(v: unknown, dflt: boolean): boolean {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return dflt;
}

/** Coerce to a safe integer with fallback. */
export function int(v: unknown, dflt: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? Math.trunc(n) : dflt;
}

/** Whether a key was explicitly provided in a JSON body (for partial PUTs). */
export function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

/**
 * Normalize a JSON-array string field (e.g. relatedProductIds, relatedProductSlugs).
 * Accepts: undefined/null → "[]", "" → "[]", an actual array → stringified,
 * a JSON array string → normalized. Returns null when invalid.
 */
export function toJsonArrayString(v: unknown): string | null {
  if (v == null) return "[]";
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return "[]";
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      /* fall through */
    }
  }
  return null;
}

/** Where-clause for blog posts that are publicly visible right now. */
export function visiblePostWhere() {
  return {
    OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", publishAt: { lte: new Date() } }],
  };
}

/** Shared orderBy for visible blog posts (newest first). */
export const POST_ORDER = [{ publishedAt: "desc" }, { createdAt: "desc" }] as const;

/** Estimate reading time (minutes) from HTML content. */
export function estimateReadingTime(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Client IP for rate limiting (falls back to "local"). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for") || "";
  const first = fwd.split(",")[0].trim();
  return first || "local";
}

/** Serialize a Testimonial row → Testimonial (dates ISO). */
export function toTestimonial(t: {
  id: string;
  name: string;
  location: string;
  rating: number;
  quote: string;
  avatarUrl: string;
  productName: string;
  featured: boolean;
  published: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): Testimonial {
  return {
    id: t.id,
    name: t.name,
    location: t.location,
    rating: t.rating,
    quote: t.quote,
    avatarUrl: t.avatarUrl,
    productName: t.productName,
    featured: t.featured,
    published: t.published,
    displayOrder: t.displayOrder,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
