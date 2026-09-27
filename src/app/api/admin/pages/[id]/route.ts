import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str, toPublicPage } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { parsePageFields, uniquePageSlug } from "../../_lib";

export const dynamic = "force-dynamic";

function toAdminPage(p: Parameters<typeof toPublicPage>[0] & { displayOrder: number }) {
  return { ...toPublicPage(p), displayOrder: p.displayOrder };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const page = await db.page.findUnique({ where: { id } });
    if (!page) return fail("Page not found.", 404);
    return ok(toAdminPage(page));
  } catch (e) {
    console.error("[api/admin/pages/[id] GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.page.findUnique({ where: { id } });
    if (!existing) return fail("Page not found.", 404);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const parsed = parsePageFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields: Record<string, unknown> = { ...parsed.fields };

    if (has(body, "slug")) {
      const slugInput = str(body.slug);
      const base = slugInput || str(body.title) || existing.title;
      fields.slug = await uniquePageSlug(base, id);
    }

    const page = await db.page.update({ where: { id }, data: fields as Prisma.PageUncheckedUpdateInput });
    return ok({ page: toAdminPage(page) });
  } catch (e) {
    console.error("[api/admin/pages/[id] PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.page.findUnique({ where: { id } });
    if (!existing) return fail("Page not found.", 404);

    await db.page.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/pages/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
