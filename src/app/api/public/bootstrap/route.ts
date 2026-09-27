import { describeDbError } from "@/lib/db";
import { fail, getSettings, ok } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return ok(settings);
  } catch (e) {
    console.error("[api/public/bootstrap]", e);
    // Real reason in the envelope → the site's error screen shows it.
    return fail(
      `Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`,
      500,
    );
  }
}
