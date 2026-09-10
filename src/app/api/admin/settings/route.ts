import { db, describeDbError } from "@/lib/db";
import { fail, getSettings, ok } from "@/lib/server-utils";
import { has, readJsonBody, str } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { DEFAULT_SETTINGS } from "@/lib/types";

export const dynamic = "force-dynamic";

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const settings = await getSettings();
    return ok(settings);
  } catch (e) {
    console.error("[api/admin/settings GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const updates: { key: string; value: string }[] = [];
    for (const key of SETTING_KEYS) {
      if (!has(body, key)) continue;
      updates.push({ key, value: str(body[key]) });
    }
    if (updates.length === 0) {
      return fail("No valid settings keys were provided.", 400);
    }

    for (const { key, value } of updates) {
      await db.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    const settings = await getSettings();
    return ok(settings);
  } catch (e) {
    console.error("[api/admin/settings PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
