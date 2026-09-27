import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { readJsonBody, toTestimonial } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { parseTestimonialFields } from "../../_lib";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;
    const { id } = await params;

    const row = await db.testimonial.findUnique({ where: { id } });
    if (!row) return fail("Testimonial not found.", 404);
    return ok({ testimonial: toTestimonial(row) });
  } catch (e) {
    console.error("[api/admin/testimonials/[id] GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;
    const { id } = await params;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const parsed = parseTestimonialFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields = parsed.fields;

    const row = await db.testimonial.update({
      where: { id },
      data: fields as Prisma.TestimonialUncheckedUpdateInput,
    });
    return ok({ testimonial: toTestimonial(row) });
  } catch (e) {
    console.error("[api/admin/testimonials/[id] PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;
    const { id } = await params;

    await db.testimonial.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/testimonials/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
