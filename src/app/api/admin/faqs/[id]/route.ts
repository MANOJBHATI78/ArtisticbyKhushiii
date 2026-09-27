import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { readJsonBody, toFaq } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { parseFaqFields } from "../../_lib";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.faq.findUnique({ where: { id } });
    if (!existing) return fail("FAQ not found.", 404);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const parsed = parseFaqFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);

    const faq = await db.faq.update({
      where: { id },
      data: parsed.fields as Prisma.FaqUncheckedUpdateInput,
    });
    return ok({ faq: toFaq(faq) });
  } catch (e) {
    console.error("[api/admin/faqs/[id] PUT]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.faq.findUnique({ where: { id } });
    if (!existing) return fail("FAQ not found.", 404);

    await db.faq.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/faqs/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
