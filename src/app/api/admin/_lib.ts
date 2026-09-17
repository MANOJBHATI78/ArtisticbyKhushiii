// Shared payload parsers for admin CRUD routes (server-side only).
// Each parser returns only the fields present in the JSON body, coerced and
// validated, so POST (create) and PUT (update) routes can share logic.

import { sanitizeHtml, slugify } from "@/lib/server-utils";
import { bool, estimateReadingTime, has, int, str, toJsonArrayString } from "@/lib/serializers";
import { db } from "@/lib/db";

export type Parsed<T> = { ok: true; fields: T } | { ok: false; error: string };

// ---------------- images ----------------

export type ImageInput = {
  id?: string;
  url: string;
  alt: string;
  caption: string;
  isFeatured: boolean;
  displayOrder: number;
};

export function parseImages(v: unknown): Parsed<ImageInput[]> {
  if (v == null) return { ok: true, fields: [] };
  if (!Array.isArray(v)) return { ok: false, error: "images must be an array." };
  const images: ImageInput[] = [];
  for (let i = 0; i < v.length; i++) {
    const raw = v[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: `images[${i}] must be an object.` };
    }
    const img = raw as Record<string, unknown>;
    const url = str(img.url);
    if (!url) return { ok: false, error: `images[${i}].url is required.` };
    images.push({
      id: str(img.id) || undefined,
      url,
      alt: str(img.alt),
      caption: str(img.caption),
      isFeatured: bool(img.isFeatured, false),
      displayOrder: int(img.displayOrder, i),
    });
  }
  return { ok: true, fields: images };
}

// ---------------- dates ----------------

export function toDateOrNull(v: unknown): Date | null | "invalid" {
  const s = str(v);
  if (s === "") return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d;
}

// ---------------- products ----------------

const PRODUCT_TEXT_FIELDS = [
  "sku", "subcategory", "shortDescription", "highlights", "customizationOptions",
  "size", "material", "colour", "occasion", "careInstructions", "tags",
  "seoTitle", "metaDescription", "focusKeyword", "secondaryKeywords",
  "ogTitle", "ogDescription", "canonicalUrl",
] as const;

export type ProductFields = Record<string, string | number | boolean>;

export function parseProductFields(body: Record<string, unknown>): Parsed<ProductFields> {
  const fields: ProductFields = {};
  if (has(body, "name")) {
    const name = str(body.name);
    if (!name) return { ok: false, error: "Product name is required." };
    fields.name = name;
  }
  for (const key of PRODUCT_TEXT_FIELDS) {
    if (has(body, key)) fields[key] = str(body[key]);
  }
  if (has(body, "longDescription")) fields.longDescription = sanitizeHtml(str(body.longDescription));
  if (has(body, "featured")) fields.featured = bool(body.featured, false);
  if (has(body, "published")) fields.published = bool(body.published, true);
  if (has(body, "displayOrder")) fields.displayOrder = int(body.displayOrder, 0);
  if (has(body, "categoryId")) {
    const categoryId = str(body.categoryId);
    if (!categoryId) return { ok: false, error: "A category is required for the product." };
    fields.categoryId = categoryId;
  }
  if (has(body, "relatedProductIds")) {
    const arr = toJsonArrayString(body.relatedProductIds);
    if (arr === null) return { ok: false, error: "relatedProductIds must be a JSON array of product ids." };
    fields.relatedProductIds = arr;
  }
  return { ok: true, fields };
}

export async function uniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 2;
  while (true) {
    const existing = await db.product.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
    if (n > 200) return `${root}-${Date.now()}`;
  }
}

// ---------------- categories ----------------

const CATEGORY_TEXT_FIELDS = [
  "shortDescription", "longDescription", "imageUrl", "mobileImageUrl", "imageAlt",
  "seoTitle", "metaDescription", "focusKeyword", "secondaryKeywords",
  "ogTitle", "ogDescription", "canonicalUrl",
] as const;

export type CategoryFields = Record<string, string | number | boolean | null>;

export function parseCategoryFields(body: Record<string, unknown>): Parsed<CategoryFields> {
  const fields: CategoryFields = {};
  if (has(body, "name")) {
    const name = str(body.name);
    if (!name) return { ok: false, error: "Category name is required." };
    fields.name = name;
  }
  for (const key of CATEGORY_TEXT_FIELDS) {
    if (has(body, key)) fields[key] = str(body[key]);
  }
  if (has(body, "introContent")) fields.introContent = sanitizeHtml(str(body.introContent));
  if (has(body, "bottomContent")) fields.bottomContent = sanitizeHtml(str(body.bottomContent));
  if (has(body, "featured")) fields.featured = bool(body.featured, false);
  if (has(body, "published")) fields.published = bool(body.published, true);
  if (has(body, "displayOrder")) fields.displayOrder = int(body.displayOrder, 0);
  if (has(body, "parentId")) fields.parentId = strOrNull2(body.parentId);
  return { ok: true, fields };
}

function strOrNull2(v: unknown): string | null {
  const s = str(v);
  return s === "" ? null : s;
}

export async function uniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 2;
  while (true) {
    const existing = await db.category.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
    if (n > 200) return `${root}-${Date.now()}`;
  }
}

// ---------------- blogs ----------------

const BLOG_TEXT_FIELDS = [
  "excerpt", "coverImage", "coverAlt", "author", "tags",
  "seoTitle", "metaDescription", "focusKeyword", "secondaryKeywords",
  "ogTitle", "ogDescription", "canonicalUrl",
] as const;

export const BLOG_STATUSES = ["DRAFT", "PUBLISHED", "SCHEDULED"] as const;

export type BlogFields = Record<string, string | number | boolean | Date | null>;

export function parseBlogFields(body: Record<string, unknown>): Parsed<BlogFields> {
  const fields: BlogFields = {};
  if (has(body, "title")) {
    const title = str(body.title);
    if (!title) return { ok: false, error: "Blog title is required." };
    fields.title = title;
  }
  for (const key of BLOG_TEXT_FIELDS) {
    if (has(body, key)) fields[key] = str(body[key]);
  }
  if (has(body, "content")) fields.content = sanitizeHtml(str(body.content));
  if (has(body, "featured")) fields.featured = bool(body.featured, false);
  if (has(body, "readingTime")) fields.readingTime = Math.max(0, int(body.readingTime, 0));
  if (has(body, "status")) {
    const statusRaw = str(body.status).toUpperCase();
    if (!(BLOG_STATUSES as readonly string[]).includes(statusRaw)) {
      return { ok: false, error: "status must be one of DRAFT, PUBLISHED or SCHEDULED." };
    }
    fields.status = statusRaw;
  }
  if (has(body, "publishAt")) {
    const d = toDateOrNull(body.publishAt);
    if (d === "invalid") return { ok: false, error: "publishAt must be a valid ISO date or empty." };
    fields.publishAt = d;
  }
  if (has(body, "publishedAt")) {
    const d = toDateOrNull(body.publishedAt);
    if (d === "invalid") return { ok: false, error: "publishedAt must be a valid ISO date or empty." };
    fields.publishedAt = d;
  }
  if (has(body, "blogCategoryId")) fields.blogCategoryId = strOrNull2(body.blogCategoryId);
  if (has(body, "relatedProductSlugs")) {
    const arr = toJsonArrayString(body.relatedProductSlugs);
    if (arr === null) return { ok: false, error: "relatedProductSlugs must be a JSON array of product slugs." };
    fields.relatedProductSlugs = arr;
  }
  return { ok: true, fields };
}

export async function uniqueBlogSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 2;
  while (true) {
    const existing = await db.blogPost.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
    if (n > 200) return `${root}-${Date.now()}`;
  }
}

/** Apply the "published → publishedAt=now" and "readingTime 0 → auto" blog rules. */
export function applyBlogRules(
  fields: BlogFields,
  existing: { status?: string; publishedAt?: Date | null; content?: string; readingTime?: number } | null,
): void {
  const targetStatus = (fields.status as string | undefined) ?? existing?.status ?? "DRAFT";
  const targetPublishedAt = (fields.publishedAt as Date | null | undefined) ?? existing?.publishedAt ?? null;
  if (targetStatus === "PUBLISHED" && !targetPublishedAt) {
    fields.publishedAt = new Date();
  }
  if (fields.readingTime === 0) {
    const content = (fields.content as string | undefined) ?? existing?.content ?? "";
    fields.readingTime = estimateReadingTime(content);
  }
}

// ---------------- pages ----------------

export type PageFields = Record<string, string | number | boolean>;

export function parsePageFields(body: Record<string, unknown>): Parsed<PageFields> {
  const fields: PageFields = {};
  if (has(body, "title")) {
    const title = str(body.title);
    if (!title) return { ok: false, error: "Page title is required." };
    fields.title = title;
  }
  for (const key of ["seoTitle", "metaDescription"] as const) {
    if (has(body, key)) fields[key] = str(body[key]);
  }
  if (has(body, "content")) fields.content = sanitizeHtml(str(body.content));
  if (has(body, "published")) fields.published = bool(body.published, true);
  if (has(body, "displayOrder")) fields.displayOrder = int(body.displayOrder, 0);
  return { ok: true, fields };
}

export async function uniquePageSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 2;
  while (true) {
    const existing = await db.page.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
    if (n > 200) return `${root}-${Date.now()}`;
  }
}

// ---------------- faqs ----------------

export type FaqFields = Record<string, string | number | boolean | null>;

export function parseFaqFields(body: Record<string, unknown>): Parsed<FaqFields> {
  const fields: FaqFields = {};
  if (has(body, "question")) {
    const question = str(body.question);
    if (!question) return { ok: false, error: "FAQ question is required." };
    fields.question = question;
  }
  if (has(body, "answer")) {
    const answer = str(body.answer);
    if (!answer) return { ok: false, error: "FAQ answer is required." };
    fields.answer = answer;
  }
  if (has(body, "entityType")) {
    const entityType = str(body.entityType).toUpperCase() || "GENERAL";
    if (!["GENERAL", "PRODUCT", "CATEGORY", "BLOG", "PAGE"].includes(entityType)) {
      return { ok: false, error: "entityType must be GENERAL, PRODUCT, CATEGORY, BLOG or PAGE." };
    }
    fields.entityType = entityType;
  }
  if (has(body, "entityId")) fields.entityId = strOrNull2(body.entityId);
  if (has(body, "displayOrder")) fields.displayOrder = int(body.displayOrder, 0);
  if (has(body, "published")) fields.published = bool(body.published, true);
  return { ok: true, fields };
}
