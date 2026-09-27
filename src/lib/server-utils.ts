import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/types";

// ---------------- Response helpers ----------------

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

/**
 * Public GET data with CDN caching — Netlify's edge caches the response for
 * `s-maxage` seconds and serves a stale copy while refreshing in the
 * background. Cuts the Turso cold-start latency (1.5-4s) to near-zero for
 * repeat visitors AND for Google's rendering live-test.
 */
export function okCached<T>(data: T, sMaxAgeSeconds = 120) {
  return NextResponse.json({ ok: true, data }, {
    headers: {
      "cache-control": `public, max-age=0, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=600`,
    },
  });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// ---------------- Basic in-memory rate limiter ----------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

// Periodically clean expired buckets to avoid memory growth
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }, 60_000);
  // Don't hold the process open
  (timer as unknown as { unref?: () => void }).unref?.();
}

// ---------------- HTML sanitization (server-side, dependency-free) ----------------

const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr", "strong", "b", "em", "i", "u",
  "ul", "ol", "li", "blockquote", "a", "img",
  "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "small", "code", "pre", "sup", "sub",
]);

const ALLOWED_ATTRS = new Set(["href", "title", "target", "rel", "src", "alt", "class", "id", "colspan", "rowspan"]);

/** Strips tags/attributes not in the allowlist; removes event handlers & javascript: URLs. */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  let clean = dirty;
  // Remove script/style blocks entirely
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, "");
  clean = clean.replace(/<!--[\s\S]*?-->/g, "");
  // Remove event handler attributes
  clean = clean.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  clean = clean.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  clean = clean.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  // Neutralize javascript: and data:text/html URLs
  clean = clean.replace(/(href|src)\s*=\s*"(?:javascript|data:text\/html)[^"]*"/gi, '$1="#"');
  clean = clean.replace(/(href|src)\s*=\s*'(?:javascript|data:text\/html)[^']*'/gi, "$1='#'");
  // Filter tags
  clean = clean.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, tag: string, attrs: string) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return "";
    if (match.startsWith("</")) return `</${lower}>`;
    // Keep only allowed attributes
    const kept: string[] = [];
    const attrRegex = /([a-zA-Z0-9-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(attrs)) !== null) {
      const attrName = m[1].toLowerCase();
      const value = m[3] ?? m[4] ?? "";
      if (ALLOWED_ATTRS.has(attrName)) {
        if (attrName === "href" || attrName === "src") {
          if (/^\s*(javascript|data:text\/html)/i.test(value)) continue;
        }
        kept.push(`${attrName}="${value.replace(/"/g, "&quot;")}"`);
      }
    }
    if (lower === "a" && kept.some((k) => k.startsWith('target="_blank"'))) {
      if (!kept.some((k) => k.startsWith("rel="))) kept.push('rel="noopener noreferrer"');
    }
    return `<${lower}${kept.length ? " " + kept.join(" ") : ""}>`;
  });
  return clean;
}

// ---------------- Settings loader ----------------

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];

export async function getSettings(): Promise<SiteSettings> {
  const rows = await db.siteSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const merged = { ...DEFAULT_SETTINGS };
  for (const key of SETTING_KEYS) {
    const val = map.get(key);
    if (val !== undefined && val !== "") merged[key] = val;
  }
  return merged;
}

// ---------------- Slug helper ----------------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  return (async () => {
    const root = slugify(base) || `item-${Date.now()}`;
    let candidate = root;
    let n = 2;
    while (await isTaken(candidate)) {
      candidate = `${root}-${n}`;
      n += 1;
      if (n > 200) return `${root}-${Date.now()}`;
    }
    return candidate;
  })();
}
