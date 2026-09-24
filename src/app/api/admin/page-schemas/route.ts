import { revalidatePath } from "next/cache";
import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { bool, has, int, readJsonBody, str } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import type { PageSchemaEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export function toPageSchemaRow(s: {
  id: string;
  name: string;
  path: string;
  schemaJson: string;
  enabled: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): PageSchemaEntry {
  return {
    id: s.id,
    name: s.name,
    path: s.path,
    schemaJson: s.schemaJson,
    enabled: s.enabled,
    displayOrder: s.displayOrder,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/** Normalizes an admin-entered page path: leading "/", no trailing "/", or "prefix/*". */
export function normalizeSchemaPath(raw: string): string {
  let p = raw.trim();
  if (!p) return "/";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) {
    if (p.endsWith("/*")) p = p.slice(0, -2).replace(/\/+$/, "") + "/*";
    else p = p.replace(/\/+$/, "");
    if (p === "" || p === "/*") p = "/";
    if (p === "/*" ) p = "/";
  }
  return p;
}

/** Validates that schemaJson is parseable JSON (object or array). Returns error text or "". */
export function validateSchemaJson(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return "Schema must be a JSON object { … } or an array of objects [ { … } ].";
    }
    return "";
  } catch {
    return "This is not valid JSON. Check for missing quotes, commas or brackets.";
  }
}

function flushShell() {
  try {
    revalidatePath("/", "page");
    revalidatePath("/", "layout");
  } catch (e) {
    console.warn("[api/admin/page-schemas] revalidatePath failed", e);
  }
}

/** GET /api/admin/page-schemas — list all schema entries. */
export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const rows = await db.pageSchema.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return ok({ schemas: rows.map(toPageSchemaRow) });
  } catch (e) {
    console.error("[api/admin/page-schemas GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)}`, 500);
  }
}

/** POST /api/admin/page-schemas — add a schema entry. */
export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const name = str(body.name).trim();
    if (name.length < 2 || name.length > 100) return fail("Please give this schema a name (2–100 characters).", 400);

    const path = normalizeSchemaPath(str(body.path) || "/");
    const schemaJson = str(body.schemaJson).trim() || "{}";
    const jsonError = validateSchemaJson(schemaJson);
    if (jsonError) return fail(jsonError, 400);

    const row = await db.pageSchema.create({
      data: {
        name,
        path,
        schemaJson,
        enabled: has(body, "enabled") ? bool(body.enabled, true) : true,
        displayOrder: int(body.displayOrder, 0),
      },
    });
    flushShell();
    return ok({ schema: toPageSchemaRow(row) });
  } catch (e) {
    console.error("[api/admin/page-schemas POST]", e);
    return fail("Something went wrong while saving. Please try again.", 500);
  }
}
