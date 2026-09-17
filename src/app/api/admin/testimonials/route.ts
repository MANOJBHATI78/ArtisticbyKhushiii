import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { readJsonBody, toTestimonial } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { parseTestimonialFields } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const where: Prisma.TestimonialWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { quote: { contains: q } },
        { productName: { contains: q } },
        { location: { contains: q } },
      ];
    }

    const rows = await db.testimonial.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });
    return ok(rows.map(toTestimonial));
  } catch (e) {
    console.error("[api/admin/testimonials GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const quote = typeof body.quote === "string" ? body.quote.trim() : "";
    if (!name) return fail("Customer name is required.", 400);
    if (!quote) return fail("Testimonial quote is required.", 400);

    const parsed = parseTestimonialFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields = parsed.fields;

    const row = await db.testimonial.create({
      data: {
        name,
        quote,
        location: fields.location ?? "",
        rating: fields.rating ?? 5,
        avatarUrl: fields.avatarUrl ?? "",
        productName: fields.productName ?? "",
        featured: fields.featured ?? false,
        published: fields.published ?? true,
        displayOrder: fields.displayOrder ?? 0,
      } as Prisma.TestimonialUncheckedCreateInput,
    });
    return ok({ testimonial: toTestimonial(row) });
  } catch (e) {
    console.error("[api/admin/testimonials POST]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
