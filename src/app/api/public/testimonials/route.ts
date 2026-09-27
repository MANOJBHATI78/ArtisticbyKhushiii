import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok, rateLimit, okCached } from "@/lib/server-utils";
import { toTestimonial } from "@/lib/serializers";

export const dynamic = "force-dynamic";

/** Strip control characters and collapse whitespace — keeps customer quotes tidy. */
function cleanText(raw: unknown, maxLen: number): string {
  return typeof raw === "string"
    ? raw.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLen)
    : "";
}

/**
 * GET /api/public/testimonials?featured=1&limit=6
 *   → published testimonials, display-ordered. Used by the homepage section.
 *
 * GET /api/public/testimonials?product=<name>&limit=6
 *   → reviews for one product: exact-piece matches first (testimonial.productName
 *     contains the product name or vice-versa, case-insensitive), then general
 *     studio reviews (no product chip) to fill the section.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const featuredOnly = url.searchParams.get("featured") === "1";
    const product = cleanText(url.searchParams.get("product"), 120);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 12, 1), 24);

    // --- per-product mode: piece-specific reviews first, general ones fill up ---
    if (product) {
      const rows = await db.testimonial.findMany({
        where: { published: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        take: 48,
      });
      const needle = product.toLowerCase();
      // Two-way match: "Family Nameplate" review ↔ "Personalized Family Nameplate" product.
      const forPiece = rows.filter((r) => {
        const piece = r.productName.toLowerCase();
        return !!piece && (piece.includes(needle) || needle.includes(piece));
      });
      const general = rows.filter((r) => !r.productName);
      const merged = [...forPiece, ...general].slice(0, limit);
      return okCached(merged.map(toTestimonial));
    }

    const where: Prisma.TestimonialWhereInput = { published: true };
    if (featuredOnly) where.featured = true;

    const rows = await db.testimonial.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
    });
    return okCached(rows.map(toTestimonial));
  } catch (e) {
    console.error("[api/public/testimonials GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

/**
 * POST /api/public/testimonials — customer "share your experience" form.
 * Creates an UNPUBLISHED testimonial (source: "public") that the owner reviews
 * in the admin Testimonials module before it appears on the site.
 * Guarded by a honeypot field + rate limit (3 per 10 min per IP).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail("Invalid request body.", 400);

    // Honeypot — real visitors never fill this hidden field.
    if (cleanText(body.company, 100)) return okCached({ received: true });

    // Rate limit: 3 submissions / 10 min per IP.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local";
    if (!rateLimit(`testimonials:${ip}`, 3, 10 * 60 * 1000)) {
      return fail("You've shared a few reviews already — thank you! Please try again later if you'd like to add more.", 429);
    }

    const name = cleanText(body.name, 80);
    const location = cleanText(body.location, 80);
    const quote = cleanText(body.quote, 600);
    const productName = cleanText(body.productName, 120);
    const ratingRaw = Number(body.rating);
    const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, Math.round(ratingRaw))) : 5;

    if (name.length < 2) return fail("Please tell us your name (at least 2 characters).", 400);
    if (quote.length < 10) return fail("Please write a few words about your experience (at least 10 characters).", 400);

    const row = await db.testimonial.create({
      data: {
        name,
        location,
        quote,
        rating,
        productName,
        avatarUrl: "",
        featured: false,
        published: false, // moderation: hidden until the owner approves
        displayOrder: 500, // public submissions sort last by default
        source: "public",
      },
    });

    return okCached({ received: true, id: row.id });
  } catch (e) {
    console.error("[api/public/testimonials POST]", e);
    return fail("Something went wrong while saving your review. Please try again.", 500);
  }
}
