import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { requireAdmin } from "../_guard";
import { applyContentSnapshot, exportBackup } from "@/lib/content-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET  → full content backup as a downloadable JSON file.
 * POST → restore / import a backup JSON into this database (upsert, non-destructive).
 */
export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const url = new URL(request.url);
    const includeLeads = url.searchParams.get("leads") !== "false";
    const snapshot = await exportBackup({ includeLeads });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 17);
    const filename = `abk-backup-${stamp}.json`;

    return new Response(JSON.stringify(snapshot, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    console.error("[api/admin/backup GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json().catch(() => null);
    const snapshot = body?.snapshot ?? body;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return fail("Invalid backup file — expected a JSON object with content tables.", 400);
    }
    const snap = snapshot as Record<string, unknown>;
    const hasContent =
      Array.isArray(snap.products) || Array.isArray(snap.categories) || Array.isArray(snap.pages) || snap.settings;
    if (!hasContent) {
      return fail("This JSON does not look like an Artistic by Khushi backup (no products/categories/pages/settings found).", 400);
    }

    // Refuse to import if the DB is unreachable mid-way — sanity count first.
    const adminCount = await db.adminUser.count();
    if (adminCount === 0) {
      return fail("Refusing to import — no admin user exists on this database.", 500);
    }

    const includeLeads = body?.includeLeads !== false && Array.isArray(snap.leads);
    const report = await applyContentSnapshot(snap as Parameters<typeof applyContentSnapshot>[0], {
      includeLeads,
      downloadMediaFrom: typeof body?.mediaSourceUrl === "string" ? body.mediaSourceUrl : undefined,
    });
    return ok(report);
  } catch (e) {
    console.error("[api/admin/backup POST]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
