import { revalidatePath } from "next/cache";
import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { bool, has, int, readJsonBody, str } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { normalizeSchemaPath, toPageSchemaRow, validateSchemaJson } from "../route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function flushShell() {
  try {
    revalidatePath("/", "page");
    revalidatePath("/", "layout");
  } catch (e) {
    console.warn("[api/admin/page-schemas/[id]] revalidatePath failed", e);
  }
}

/** PUT /api/admin/page-schemas/[id] — edit a schema entry. */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const existing = await db.pageSchema.findUnique({ where: { id } });
    if (!existing) return fail("Schema entry not found.", 404);

    const data: { name?: string; path?: string; schemaJson?: string; enabled?: boolean; displayOrder?: number } = {};

    if (has(body, "name")) {
      const name = str(body.name).trim();
      if (name.length < 2 || name.length > 100) return fail("Name must be 2–100 characters.", 400);
      data.name = name;
    }
    if (has(body, "path")) {
      data.path = normalizeSchemaPath(str(body.path) || "/");
    }
    if (has(body, "schemaJson")) {
      const schemaJson = str(body.schemaJson).trim() || "{}";
      const jsonError = validateSchemaJson(schemaJson);
      if (jsonError) return fail(jsonError, 400);
      data.schemaJson = schemaJson;
    }
    if (has(body, "enabled")) data.enabled = bool(body.enabled, true);
    if (has(body, "displayOrder")) data.displayOrder = int(body.displayOrder, 0);

    if (Object.keys(data).length === 0) return fail("Nothing to update.", 400);

    const row = await db.pageSchema.update({ where: { id }, data });
    flushShell();
    return ok({ schema: toPageSchemaRow(row) });
  } catch (e) {
    console.error("[api/admin/page-schemas/[id] PUT]", e);
    return fail("Something went wrong while saving. Please try again.", 500);
  }
}

/** DELETE /api/admin/page-schemas/[id] — remove a schema entry. */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.pageSchema.findUnique({ where: { id } });
    if (!existing) return fail("Schema entry not found.", 404);

    await db.pageSchema.delete({ where: { id } });
    flushShell();
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/page-schemas/[id] DELETE]", e);
    return fail("Something went wrong while deleting. Please try again.", 500);
  }
}
