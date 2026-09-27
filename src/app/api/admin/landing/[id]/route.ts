import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str, toLanding } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { parseLandingFields, uniqueLandingSlug } from "../../_lib";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const landing = await db.landingPage.findUnique({ where: { id } });
    if (!landing) return fail("Landing page not found.", 404);
    return ok(toLanding(landing));
  } catch (e) {
    console.error("[api/admin/landing/[id] GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.landingPage.findUnique({ where: { id } });
    if (!existing) return fail("Landing page not found.", 404);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const parsed = parseLandingFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields: Record<string, unknown> = { ...parsed.fields };

    if (has(body, "slug")) {
      const slugInput = str(body.slug);
      if (slugInput && !SLUG_RE.test(slugInput)) {
        return fail("Slug can only contain lowercase letters, numbers and hyphens (e.g. diwali-gifting).", 400);
      }
      const base = slugInput || str(body.title) || existing.title;
      fields.slug = base === existing.slug ? existing.slug : await uniqueLandingSlug(base, id);
    }

    if (Object.keys(fields).length === 0) {
      return fail("No valid landing fields were provided.", 400);
    }

    const landing = await db.landingPage.update({
      where: { id },
      data: fields as Prisma.LandingPageUncheckedUpdateInput,
    });
    return ok({ landing: toLanding(landing) });
  } catch (e) {
    console.error("[api/admin/landing/[id] PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.landingPage.findUnique({ where: { id } });
    if (!existing) return fail("Landing page not found.", 404);

    await db.landingPage.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/landing/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
