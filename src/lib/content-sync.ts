/**
 * Content sync engine — the "never lose your live changes" layer.
 *
 * Three operations:
 *  1. exportBackup()      → read every content table from THIS database as JSON
 *  2. applyContentSnapshot() → upsert a backup JSON into THIS database (restore / migrate)
 *  3. pullFromLive()      → login to a live site (e.g. https://artisticbykhushiii.com),
 *                           download all content + media files, apply here
 *
 * Guarantees:
 *  - Live data is never overwritten BY deploys (seed only runs on an empty DB);
 *    this module is the owner-controlled path to move content around explicitly.
 *  - Upserts are keyed by natural keys (slug / key / sectionKey / url) so local
 *    row IDs stay stable — product images & FAQ relations are remapped safely.
 */
import { db } from "@/lib/db";
import { storeUpload, deleteUploadChunks, readUploadFromDb, safeUploadPathFromUrl } from "@/lib/uploads";
import { readFile } from "node:fs/promises";

const SESSION_COOKIE = "abk_admin_session";

// ---------------- types ----------------

export interface SyncCounts {
  settings: number;
  categories: number;
  blogCategories: number;
  products: number;
  productImages: number;
  blogs: number;
  pages: number;
  faqs: number;
  testimonials: number;
  homepageSections: number;
  landingPages: number;
  leads: number;
  mediaAssets: number;
}

export interface SyncReport {
  ok: boolean;
  source: string;
  counts: SyncCounts;
  media: { downloaded: number; skipped: number; failed: number };
  warnings: string[];
  startedAt: string;
  finishedAt: string;
}

export interface ContentSnapshot {
  version: number;
  generatedAt: string;
  siteName: string;
  settings: Record<string, string>;
  categories: Array<Record<string, unknown>>;
  blogCategories: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  blogs: Array<Record<string, unknown>>;
  pages: Array<Record<string, unknown>>;
  faqs: Array<Record<string, unknown>>;
  testimonials: Array<Record<string, unknown>>;
  homepageSections: Array<Record<string, unknown>>;
  landingPages: Array<Record<string, unknown>>;
  leads: Array<Record<string, unknown>>;
  mediaAssets: Array<Record<string, unknown>>;
}

const emptyCounts = (): SyncCounts => ({
  settings: 0, categories: 0, blogCategories: 0, products: 0, productImages: 0,
  blogs: 0, pages: 0, faqs: 0, testimonials: 0, homepageSections: 0, landingPages: 0, leads: 0, mediaAssets: 0,
});

// ---------------- helpers ----------------

function s(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}
function n(v: unknown, fallback = 0): number {
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : fallback;
}
function b(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}
function d(v: unknown): Date {
  const parsed = v ? new Date(s(v)) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Collect every /uploads/... URL mentioned anywhere in a snapshot. */
function collectUploadUrls(snap: Partial<ContentSnapshot>): string[] {
  const urls = new Set<string>();
  const add = (u: unknown) => {
    const v = s(u);
    if (v.startsWith("/uploads/")) urls.add(v);
  };
  (snap.categories ?? []).forEach((c) => { add(c.imageUrl); add(c.mobileImageUrl); });
  (snap.products ?? []).forEach((p) => {
    const gallery = Array.isArray(p.gallery) ? p.gallery : [];
    gallery.forEach((img) => add((img as Record<string, unknown>)?.url));
    add(p.featuredImageUrl);
  });
  (snap.blogs ?? []).forEach((x) => add(x.coverImage));
  (snap.testimonials ?? []).forEach((x) => add(x.avatarUrl));
  (snap.homepageSections ?? []).forEach((x) => { add(x.imageUrl); add(x.mobileImageUrl); });
  (snap.landingPages ?? []).forEach((x) => { add(x.heroImageUrl); add(x.heroMobileImageUrl); add(x.ogImageUrl); });
  (snap.mediaAssets ?? []).forEach((x) => add(x.url));
  Object.values(snap.settings ?? {}).forEach(add);
  return [...urls];
}

// ---------------- 1. export ----------------

export async function exportBackup(opts?: { includeLeads?: boolean }): Promise<ContentSnapshot> {
  const includeLeads = opts?.includeLeads !== false;
  const [settings, categories, blogCategories, products, blogs, pages, faqs, testimonials, sections, landings, leads, media] =
    await Promise.all([
      db.siteSetting.findMany(),
      db.category.findMany({ orderBy: { displayOrder: "asc" } }),
      db.blogCategory.findMany(),
      db.product.findMany({ orderBy: { displayOrder: "asc" }, include: { images: true, category: { select: { slug: true } } } }),
      db.blogPost.findMany({ orderBy: { createdAt: "desc" }, include: { blogCategory: { select: { slug: true } } } }),
      db.page.findMany({ orderBy: { displayOrder: "asc" } }),
      db.faq.findMany({ orderBy: { displayOrder: "asc" } }),
      db.testimonial.findMany({ orderBy: { displayOrder: "asc" } }),
      db.homepageSection.findMany({ orderBy: { displayOrder: "asc" } }),
      db.landingPage.findMany({ orderBy: { displayOrder: "asc" } }),
      includeLeads ? db.lead.findMany({ orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
      db.mediaAsset.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

  const brand = settings.find((x) => x.key === "brandName")?.value ?? "Artistic by Khushi";

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    siteName: brand,
    settings: Object.fromEntries(settings.map((x) => [x.key, x.value])),
    categories: categories.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, shortDescription: c.shortDescription,
      longDescription: c.longDescription, imageUrl: c.imageUrl, mobileImageUrl: c.mobileImageUrl,
      imageAlt: c.imageAlt, introContent: c.introContent, bottomContent: c.bottomContent,
      featured: c.featured, displayOrder: c.displayOrder, parentSlug: null, published: c.published,
      seoTitle: c.seoTitle, metaDescription: c.metaDescription, focusKeyword: c.focusKeyword,
      secondaryKeywords: c.secondaryKeywords, ogTitle: c.ogTitle, ogDescription: c.ogDescription,
      canonicalUrl: c.canonicalUrl,
    })),
    blogCategories: blogCategories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    products: products.map((p) => ({
      id: p.id, name: p.name, slug: p.slug, sku: p.sku, categorySlug: p.category?.slug ?? "",
      subcategory: p.subcategory, shortDescription: p.shortDescription, longDescription: p.longDescription,
      highlights: p.highlights, customizationOptions: p.customizationOptions, size: p.size,
      material: p.material, colour: p.colour, occasion: p.occasion, careInstructions: p.careInstructions,
      tags: p.tags, featured: p.featured, published: p.published, displayOrder: p.displayOrder,
      relatedProductIds: p.relatedProductIds, seoTitle: p.seoTitle, metaDescription: p.metaDescription,
      focusKeyword: p.focusKeyword, secondaryKeywords: p.secondaryKeywords, ogTitle: p.ogTitle,
      ogDescription: p.ogDescription, canonicalUrl: p.canonicalUrl,
      gallery: p.images.map((img) => ({ url: img.url, alt: img.alt, caption: img.caption, isFeatured: img.isFeatured, displayOrder: img.displayOrder })),
    })),
    blogs: blogs.map((x) => ({
      id: x.id, title: x.title, slug: x.slug, excerpt: x.excerpt, content: x.content,
      coverImage: x.coverImage, coverAlt: x.coverAlt, author: x.author, readingTime: x.readingTime,
      tags: x.tags, featured: x.featured, status: x.status, publishAt: x.publishAt?.toISOString() ?? null,
      publishedAt: x.publishedAt?.toISOString() ?? null, blogCategorySlug: x.blogCategory?.slug ?? null,
      relatedProductSlugs: x.relatedProductSlugs, seoTitle: x.seoTitle, metaDescription: x.metaDescription,
      focusKeyword: x.focusKeyword, secondaryKeywords: x.secondaryKeywords, ogTitle: x.ogTitle,
      ogDescription: x.ogDescription, canonicalUrl: x.canonicalUrl,
    })),
    pages: pages.map((p) => ({
      id: p.id, title: p.title, slug: p.slug, content: p.content, published: p.published,
      displayOrder: p.displayOrder, seoTitle: p.seoTitle, metaDescription: p.metaDescription,
    })),
    faqs: faqs.map((f) => ({
      question: f.question, answer: f.answer, entityType: f.entityType, entityId: f.entityId,
      displayOrder: f.displayOrder, published: f.published,
    })),
    testimonials: testimonials.map((t) => ({
      name: t.name, location: t.location, rating: t.rating, quote: t.quote,
      avatarUrl: t.avatarUrl, productName: t.productName, featured: t.featured,
      published: t.published, displayOrder: t.displayOrder, source: t.source,
    })),
    homepageSections: sections.map((x) => ({
      sectionKey: x.sectionKey, heading: x.heading, subheading: x.subheading, body: x.body,
      imageUrl: x.imageUrl, mobileImageUrl: x.mobileImageUrl, ctaText: x.ctaText, ctaUrl: x.ctaUrl,
      ctaText2: x.ctaText2, ctaUrl2: x.ctaUrl2, itemsJson: x.itemsJson, visible: x.visible,
      displayOrder: x.displayOrder,
    })),
    landingPages: landings.map((x) => ({ ...x, createdAt: undefined, updatedAt: undefined })),
    leads: leads.map((x) => ({
      id: x.id, name: x.name, mobile: x.mobile, city: x.city, product: x.product,
      productUrl: x.productUrl, category: x.category, message: x.message,
      preferredContact: x.preferredContact, sourcePage: x.sourcePage, utmSource: x.utmSource,
      utmMedium: x.utmMedium, utmCampaign: x.utmCampaign, referrer: x.referrer, status: x.status,
      notes: x.notes, createdAt: x.createdAt.toISOString(),
    })),
    mediaAssets: media.map((x) => ({
      url: x.url, filename: x.filename, alt: x.alt, caption: x.caption, title: x.title, size: x.size,
    })),
  };
}

// ---------------- 2. apply (restore / migrate) ----------------

export async function applyContentSnapshot(
  snap: Partial<ContentSnapshot>,
  opts?: { downloadMediaFrom?: string; includeLeads?: boolean },
): Promise<SyncReport> {
  const startedAt = new Date().toISOString();
  const counts = emptyCounts();
  const warnings: string[] = [];
  const media = { downloaded: 0, skipped: 0, failed: 0 };

  // --- settings ---
  for (const [key, value] of Object.entries(snap.settings ?? {})) {
    if (!key) continue;
    await db.siteSetting.upsert({
      where: { key },
      update: { value: s(value) },
      create: { key, value: s(value) },
    });
    counts.settings++;
  }

  // --- blog categories (needed before blogs) ---
  for (const c of snap.blogCategories ?? []) {
    const slug = s(c.slug);
    if (!slug) continue;
    await db.blogCategory.upsert({
      where: { slug },
      update: { name: s(c.name) },
      create: { name: s(c.name, slug), slug },
    });
    counts.blogCategories++;
  }
  const blogCatIdBySlug = new Map(
    (await db.blogCategory.findMany({ select: { id: true, slug: true } })).map((x) => [x.slug, x.id]),
  );

  // --- categories (upsert by slug, remember live-id → local-id) ---
  const catIdMap = new Map<string, string>(); // liveId → localId
  const catSlugById = new Map<string, string>(); // liveId → slug (for parent remap)
  for (const c of snap.categories ?? []) {
    const slug = s(c.slug);
    const name = s(c.name);
    if (!slug || !name) continue;
    const row = await db.category.upsert({
      where: { slug },
      update: {
        name, shortDescription: s(c.shortDescription), longDescription: s(c.longDescription),
        imageUrl: s(c.imageUrl), mobileImageUrl: s(c.mobileImageUrl), imageAlt: s(c.imageAlt),
        introContent: s(c.introContent), bottomContent: s(c.bottomContent),
        featured: b(c.featured), displayOrder: n(c.displayOrder), published: b(c.published, true),
        seoTitle: s(c.seoTitle), metaDescription: s(c.metaDescription), focusKeyword: s(c.focusKeyword),
        secondaryKeywords: s(c.secondaryKeywords), ogTitle: s(c.ogTitle), ogDescription: s(c.ogDescription),
        canonicalUrl: s(c.canonicalUrl),
      },
      create: {
        name, slug, shortDescription: s(c.shortDescription), longDescription: s(c.longDescription),
        imageUrl: s(c.imageUrl), mobileImageUrl: s(c.mobileImageUrl), imageAlt: s(c.imageAlt),
        introContent: s(c.introContent), bottomContent: s(c.bottomContent),
        featured: b(c.featured), displayOrder: n(c.displayOrder), published: b(c.published, true),
        seoTitle: s(c.seoTitle), metaDescription: s(c.metaDescription), focusKeyword: s(c.focusKeyword),
        secondaryKeywords: s(c.secondaryKeywords), ogTitle: s(c.ogTitle), ogDescription: s(c.ogDescription),
        canonicalUrl: s(c.canonicalUrl),
      },
    });
    const liveId = s(c.id);
    if (liveId) { catIdMap.set(liveId, row.id); catSlugById.set(liveId, slug); }
    counts.categories++;
  }

  // --- products (upsert by slug; images recreated; relations remapped) ---
  const prodIdMap = new Map<string, string>(); // liveId → localId
  const prodSlugById = new Map<string, string>();
  for (const p of snap.products ?? []) {
    const slug = s(p.slug);
    const name = s(p.name);
    if (!slug || !name) continue;
    let categoryId = catIdMap.get(s(p.categoryId)) ?? null;
    if (!categoryId) {
      const catSlug = s(p.categorySlug);
      const cat = catSlug ? await db.category.findUnique({ where: { slug: catSlug } }) : null;
      categoryId = cat?.id ?? null;
    }
    if (!categoryId) {
      const fallback = await db.category.findFirst({ orderBy: { displayOrder: "asc" } });
      categoryId = fallback?.id ?? null;
    }
    if (!categoryId) {
      warnings.push(`Product "${name}" skipped — no category could be resolved.`);
      continue;
    }
    const data = {
      name, slug, sku: s(p.sku), categoryId, subcategory: s(p.subcategory),
      shortDescription: s(p.shortDescription), longDescription: s(p.longDescription),
      highlights: s(p.highlights), customizationOptions: s(p.customizationOptions),
      size: s(p.size), material: s(p.material), colour: s(p.colour), occasion: s(p.occasion),
      careInstructions: s(p.careInstructions), tags: s(p.tags), featured: b(p.featured),
      published: b(p.published, true), displayOrder: n(p.displayOrder),
      seoTitle: s(p.seoTitle), metaDescription: s(p.metaDescription), focusKeyword: s(p.focusKeyword),
      secondaryKeywords: s(p.secondaryKeywords), ogTitle: s(p.ogTitle), ogDescription: s(p.ogDescription),
      canonicalUrl: s(p.canonicalUrl),
    };
    const row = await db.product.upsert({ where: { slug }, update: data, create: data });
    const liveId = s(p.id);
    if (liveId) { prodIdMap.set(liveId, row.id); prodSlugById.set(liveId, slug); }

    // relatedProductIds (JSON array of live ids or slugs) → remap to local ids
    let related: string[] = [];
    try {
      const parsed = typeof p.relatedProductIds === "string" ? JSON.parse(p.relatedProductIds || "[]") : p.relatedProductIds;
      if (Array.isArray(parsed)) {
        for (const ref of parsed) {
          const key = s(ref);
          if (!key) continue;
          const localId = prodIdMap.get(key); // live id → local id
          if (localId) { related.push(localId); continue; }
          const bySlug = await db.product.findUnique({ where: { slug: key }, select: { id: true } });
          if (bySlug) related.push(bySlug.id);
        }
        related = [...new Set(related)];
      }
    } catch { /* leave empty */ }
    await db.product.update({ where: { id: row.id }, data: { relatedProductIds: JSON.stringify(related) } });

    // gallery — replace images wholesale
    const gallery = Array.isArray(p.gallery) ? (p.gallery as Array<Record<string, unknown>>) : [];
    await db.productImage.deleteMany({ where: { productId: row.id } });
    let order = 0;
    for (const img of gallery) {
      const url = s(img.url);
      if (!url) continue;
      await db.productImage.create({
        data: {
          productId: row.id, url, alt: s(img.alt), caption: s(img.caption),
          isFeatured: b(img.isFeatured), displayOrder: Number.isFinite(n(img.displayOrder)) ? n(img.displayOrder) : order,
        },
      });
      order++;
      counts.productImages++;
    }
    counts.products++;
  }

  // --- category parent remap (second pass) ---
  for (const c of snap.categories ?? []) {
    const liveId = s(c.id);
    const parentLiveId = s((c as Record<string, unknown>).parentId);
    if (!liveId || !parentLiveId) continue;
    const localId = catIdMap.get(liveId);
    const localParent = catIdMap.get(parentLiveId);
    if (localId && localParent && localId !== localParent) {
      await db.category.update({ where: { id: localId }, data: { parentId: localParent } });
    }
  }

  // --- blog posts ---
  for (const x of snap.blogs ?? []) {
    const slug = s(x.slug);
    const title = s(x.title);
    if (!slug || !title) continue;
    const catSlug = s(x.blogCategorySlug) || null;
    const blogCategoryId = catSlug ? blogCatIdBySlug.get(catSlug) ?? null : null;
    const data = {
      title, slug, excerpt: s(x.excerpt), content: s(x.content), coverImage: s(x.coverImage),
      coverAlt: s(x.coverAlt), author: s(x.author), readingTime: n(x.readingTime, 3), tags: s(x.tags),
      featured: b(x.featured), status: s(x.status, "PUBLISHED"),
      publishAt: x.publishAt ? d(x.publishAt) : null,
      publishedAt: x.publishedAt ? d(x.publishedAt) : d(x.createdAt),
      relatedProductSlugs: s(x.relatedProductSlugs), blogCategoryId,
      seoTitle: s(x.seoTitle), metaDescription: s(x.metaDescription), focusKeyword: s(x.focusKeyword),
      secondaryKeywords: s(x.secondaryKeywords), ogTitle: s(x.ogTitle), ogDescription: s(x.ogDescription),
      canonicalUrl: s(x.canonicalUrl),
    };
    await db.blogPost.upsert({ where: { slug }, update: data, create: data });
    counts.blogs++;
  }

  // --- pages ---
  for (const p of snap.pages ?? []) {
    const slug = s(p.slug);
    const title = s(p.title);
    if (!slug || !title) continue;
    const data = {
      title, slug, content: s(p.content), published: b(p.published, true),
      displayOrder: n(p.displayOrder), seoTitle: s(p.seoTitle), metaDescription: s(p.metaDescription),
    };
    await db.page.upsert({ where: { slug }, update: data, create: data });
    counts.pages++;
  }

  // --- faqs (rebuild; entity ids remapped via slug maps) ---
  const faqs = snap.faqs ?? [];
  if (faqs.length > 0 || opts?.downloadMediaFrom) {
    await db.faq.deleteMany({});
    for (const f of faqs) {
      const question = s(f.question);
      if (!question) continue;
      const entityType = s(f.entityType, "GENERAL");
      let productId: string | null = null;
      let blogPostId: string | null = null;
      let pageId: string | null = null;
      const ref = s(f.entityId) || s(f.productId) || s(f.blogPostId) || s(f.pageId);
      if (ref) {
        if (entityType === "PRODUCT") productId = prodIdMap.get(ref) ?? null;
        else if (entityType === "BLOG") {
          const found = await db.blogPost.findUnique({ where: { slug: s(f.blogSlug) || ref } });
          blogPostId = found?.id ?? null;
        } else if (entityType === "PAGE") {
          const found = await db.page.findUnique({ where: { slug: s(f.pageSlug) || ref } });
          pageId = found?.id ?? null;
        }
      }
      await db.faq.create({
        data: {
          question, answer: s(f.answer), entityType, displayOrder: n(f.displayOrder),
          published: b(f.published, true), productId, blogPostId, pageId,
        },
      });
      counts.faqs++;
    }
  }

  // --- testimonials (rebuild — no unique key, wholesale replace) ---
  const testimonials = snap.testimonials ?? [];
  if (testimonials.length > 0 || opts?.downloadMediaFrom) {
    await db.testimonial.deleteMany({});
    for (const t of testimonials) {
      const name = s(t.name);
      const quote = s(t.quote);
      if (!name || !quote) continue;
      const rating = Math.min(5, Math.max(1, n(t.rating, 5)));
      await db.testimonial.create({
        data: {
          name, quote, rating, location: s(t.location), avatarUrl: s(t.avatarUrl),
          productName: s(t.productName), featured: b(t.featured),
          published: b(t.published, true), displayOrder: n(t.displayOrder),
          source: s(t.source) === "public" ? "public" : "admin",
        },
      });
      counts.testimonials++;
    }
  }

  // --- homepage sections ---
  for (const x of snap.homepageSections ?? []) {
    const sectionKey = s(x.sectionKey);
    if (!sectionKey) continue;
    const data = {
      heading: s(x.heading), subheading: s(x.subheading), body: s(x.body), imageUrl: s(x.imageUrl),
      mobileImageUrl: s(x.mobileImageUrl), ctaText: s(x.ctaText), ctaUrl: s(x.ctaUrl),
      ctaText2: s(x.ctaText2), ctaUrl2: s(x.ctaUrl2), itemsJson: s(x.itemsJson, "[]"),
      visible: b(x.visible, true), displayOrder: n(x.displayOrder),
    };
    await db.homepageSection.upsert({ where: { sectionKey }, update: data, create: { sectionKey, ...data } });
    counts.homepageSections++;
  }

  // --- landing pages ---
  for (const x of snap.landingPages ?? []) {
    const slug = s(x.slug);
    const title = s(x.title);
    if (!slug || !title) continue;
    const data = {
      title, slug, headline: s(x.headline), subheadline: s(x.subheadline),
      heroImageUrl: s(x.heroImageUrl), heroMobileImageUrl: s(x.heroMobileImageUrl),
      bodyHtml: s(x.bodyHtml), customHtml: s(x.customHtml), customCss: s(x.customCss),
      customJs: s(x.customJs), schemaJson: s(x.schemaJson), faqsJson: s(x.faqsJson, "[]"),
      productIds: s(x.productIds, "[]"), categoryIds: s(x.categoryIds, "[]"),
      metaTitle: s(x.metaTitle), metaDescription: s(x.metaDescription), focusKeyword: s(x.focusKeyword),
      secondaryKeywords: s(x.secondaryKeywords), canonicalUrl: s(x.canonicalUrl),
      ogTitle: s(x.ogTitle), ogDescription: s(x.ogDescription), ogImageUrl: s(x.ogImageUrl),
      geoRegion: s(x.geoRegion), geoPlacename: s(x.geoPlacename), geoPosition: s(x.geoPosition),
      targetLocations: s(x.targetLocations), llmSummary: s(x.llmSummary), llmKeywords: s(x.llmKeywords),
      ctaText: s(x.ctaText), ctaUrl: s(x.ctaUrl), noindex: b(x.noindex), published: b(x.published),
      displayOrder: n(x.displayOrder),
    };
    await db.landingPage.upsert({ where: { slug }, update: data, create: data });
    counts.landingPages++;
  }

  // --- leads (optional; keep by id) ---
  if (opts?.includeLeads !== false) {
    for (const x of snap.leads ?? []) {
      const id = s(x.id);
      const name = s(x.name);
      const mobile = s(x.mobile);
      if (!name || !mobile) continue;
      await db.lead.upsert({
        where: { id: id || "nonexistent" },
        update: { status: s(x.status, "NEW"), notes: s(x.notes) },
        create: {
          ...(id ? { id } : {}), name, mobile, city: s(x.city), product: s(x.product),
          productUrl: s(x.productUrl), category: s(x.category), message: s(x.message),
          preferredContact: s(x.preferredContact), sourcePage: s(x.sourcePage),
          utmSource: s(x.utmSource), utmMedium: s(x.utmMedium), utmCampaign: s(x.utmCampaign),
          referrer: s(x.referrer), status: s(x.status, "NEW"), notes: s(x.notes),
          createdAt: x.createdAt ? d(x.createdAt) : new Date(),
        },
      });
      counts.leads++;
    }
  }

  // --- media assets (upsert by url) ---
  const existingMediaUrls = new Set((await db.mediaAsset.findMany({ select: { url: true } })).map((m) => m.url));
  for (const x of snap.mediaAssets ?? []) {
    const url = s(x.url);
    if (!url || existingMediaUrls.has(url)) continue;
    await db.mediaAsset.create({
      data: {
        url, filename: s(x.filename, url.split("/").pop() ?? "file"),
        alt: s(x.alt), caption: s(x.caption), title: s(x.title), size: n(x.size),
      },
    });
    counts.mediaAssets++;
  }

  // --- media files (download from source when requested) ---
  const sourceBase = opts?.downloadMediaFrom?.trim().replace(/\/+$/, "");
  if (sourceBase) {
    const urls = collectUploadUrls(snap);
    for (const url of urls) {
      const filename = url.replace(/^\/uploads\//, "");
      try {
        const localPath = safeUploadPathFromUrl(url);
        if (localPath) {
          try {
            await readFile(localPath);
            media.skipped++;
            continue; // already on disk
          } catch { /* not on disk — keep going */ }
        }
        const chunks = await readUploadFromDb(filename).catch(() => null);
        if (chunks) { media.skipped++; continue; }

        const res = await fetch(`${sourceBase}${url}`, { redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        await deleteUploadChunks(filename);
        await storeUpload(filename, bytes);
        media.downloaded++;
      } catch (e) {
        media.failed++;
        warnings.push(`Media ${url}: ${e instanceof Error ? e.message : "download failed"}`);
      }
    }
  }

  return {
    ok: true,
    source: sourceBase ?? "backup-file",
    counts,
    media,
    warnings,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

// ---------------- 3. pull from live ----------------

interface PullOptions {
  email?: string;
  password?: string;
  includeLeads?: boolean;
  includeMedia?: boolean;
  timeoutMs?: number;
}

async function apiGet<T>(base: string, path: string, cookie: string | null, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : undefined,
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; data?: T };
    return (json.data ?? (json as unknown)) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the session token from a login response. */
async function loginToSource(base: string, email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const match = raw.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
      if (match) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

interface Paginated<T> { items: T[]; total: number }

export async function pullFromLive(
  sourceUrl: string,
  opts?: PullOptions,
): Promise<SyncReport> {
  const startedAt = new Date().toISOString();
  const base = sourceUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(base)) {
    throw new Error("Source URL must start with http:// or https://");
  }
  const timeoutMs = opts?.timeoutMs ?? 20_000;
  const warnings: string[] = [];

  const email = (opts?.email ?? process.env.ABK_SYNC_EMAIL ?? "admin@artisticbykhushi.com").trim();
  const password = opts?.password ?? process.env.ABK_SYNC_PASSWORD ?? "Khushi@2024";

  const token = await loginToSource(base, email, password);
  if (!token) warnings.push("Admin login failed — falling back to public APIs (drafts & leads will be skipped).");
  const cookie = token;

  const [settingsRes, categoriesRes, productsRes, blogsRes, pagesRes, faqsRes, testimonialsRes, homepageRes, landingRes, leadsRes, mediaRes, blogCatsRes] =
    await Promise.all([
      apiGet<Record<string, string>>(base, "/api/admin/settings", cookie, timeoutMs),
      apiGet<Array<Record<string, unknown>>>(base, "/api/admin/categories", cookie, timeoutMs),
      apiGet<Paginated<Record<string, unknown>>>(base, "/api/admin/products?pageSize=100&page=1", cookie, timeoutMs),
      apiGet<Paginated<Record<string, unknown>>>(base, "/api/admin/blogs?pageSize=100&page=1", cookie, timeoutMs),
      apiGet<Array<Record<string, unknown>>>(base, "/api/admin/pages", cookie, timeoutMs),
      apiGet<Array<Record<string, unknown>>>(base, "/api/admin/faqs", cookie, timeoutMs),
      apiGet<Array<Record<string, unknown>>>(base, "/api/admin/testimonials", cookie, timeoutMs),
      apiGet<Array<Record<string, unknown>>>(base, "/api/admin/homepage", cookie, timeoutMs),
      apiGet<Array<Record<string, unknown>>>(base, "/api/admin/landing?pageSize=100", cookie, timeoutMs),
      opts?.includeLeads !== false && cookie
        ? apiGet<Paginated<Record<string, unknown>>>(base, "/api/admin/leads?pageSize=200&page=1", cookie, timeoutMs)
        : Promise.resolve(null),
      cookie ? apiGet<Array<Record<string, unknown>>>(base, "/api/admin/media", cookie, timeoutMs) : Promise.resolve(null),
      apiGet<Array<Record<string, unknown>>>(base, "/api/public/blog-categories", null, timeoutMs),
    ]);

  // Fetch remaining product pages if the site has more than 100 products.
  let products = productsRes?.items ?? [];
  if (productsRes && productsRes.total > products.length) {
    const pages = Math.ceil(productsRes.total / 100);
    for (let page = 2; page <= pages; page++) {
      const next = await apiGet<Paginated<Record<string, unknown>>>(base, `/api/admin/products?pageSize=100&page=${page}`, cookie, timeoutMs);
      if (!next) break;
      products = products.concat(next.items);
    }
  }

  const snapshot: Partial<ContentSnapshot> = {
    settings: settingsRes ?? {},
    categories: (categoriesRes ?? []).map((c) => ({ ...c, parentSlug: null })),
    blogCategories: blogCatsRes ?? [],
    products,
    blogs: blogsRes?.items ?? [],
    pages: pagesRes ?? [],
    faqs: (faqsRes ?? []).map((f) => ({ ...f })),
    testimonials: testimonialsRes ?? [],
    homepageSections: homepageRes ?? [],
    landingPages: Array.isArray(landingRes) ? landingRes : (landingRes as { items?: Array<Record<string, unknown>> } | null)?.items ?? [],
    leads: leadsRes?.items ?? [],
    mediaAssets: mediaRes ?? [],
  };

  if (!settingsRes && !categoriesRes && products.length === 0 && !pagesRes) {
    throw new Error("Could not read any content from the source site — check the URL and try again.");
  }

  const report = await applyContentSnapshot(snapshot, {
    includeLeads: opts?.includeLeads !== false && Boolean(cookie),
    downloadMediaFrom: opts?.includeMedia === false ? undefined : base,
  });
  report.source = base;
  report.warnings = [...warnings, ...report.warnings];
  report.startedAt = startedAt;
  return report;
}
