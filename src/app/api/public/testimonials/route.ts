import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { toTestimonial } from "@/lib/serializers";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/testimonials?featured=1&limit=6
 * Published testimonials, display-ordered. Used by the homepage section.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const featuredOnly = url.searchParams.get("featured") === "1";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 12, 1), 24);

    const where: Prisma.TestimonialWhereInput = { published: true };
    if (featuredOnly) where.featured = true;

    const rows = await db.testimonial.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
    });
    return ok(rows.map(toTestimonial));
  } catch (e) {
    console.error("[api/public/testimonials GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
