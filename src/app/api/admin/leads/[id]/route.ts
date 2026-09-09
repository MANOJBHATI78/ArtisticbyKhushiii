import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { readJsonBody, str, toLead } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { LEAD_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) return fail("Lead not found.", 404);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const data: { status?: string; notes?: string } = {};

    if (body.status !== undefined) {
      const status = str(body.status).toUpperCase();
      if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
        return fail(`status must be one of: ${LEAD_STATUSES.join(", ")}.`, 400);
      }
      data.status = status;
    }
    if (body.notes !== undefined) {
      const notes = str(body.notes);
      if (notes.length > 5000) return fail("Notes are too long (max 5000 characters).", 400);
      data.notes = notes;
    }

    if (Object.keys(data).length === 0) {
      return fail("Provide status and/or notes to update.", 400);
    }

    const lead = await db.lead.update({ where: { id }, data });
    return ok({ lead: toLead(lead) });
  } catch (e) {
    console.error("[api/admin/leads/[id] PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) return fail("Lead not found.", 404);

    await db.lead.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/leads/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
