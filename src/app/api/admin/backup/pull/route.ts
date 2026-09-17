import { describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { str } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { pullFromLive } from "@/lib/content-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pull all content (products, blogs, pages, FAQs, homepage, settings, media…)
 * from a live Artistic by Khushi site into THIS database. Requires the source
 * site's admin credentials — content is fetched through its admin APIs.
 */
export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await request.json().catch(() => null);
    if (!body) return fail("Invalid request body.", 400);

    const sourceUrl = str(body.sourceUrl).trim();
    if (!/^https?:\/\//.test(sourceUrl)) {
      return fail("Source URL must start with http:// or https:// (e.g. https://artisticbykhushiii.com).", 400);
    }

    const report = await pullFromLive(sourceUrl, {
      email: str(body.email) || undefined,
      password: str(body.password) || undefined,
      includeLeads: body.includeLeads !== false,
      includeMedia: body.includeMedia !== false,
      timeoutMs: 25_000,
    });

    return ok(report);
  } catch (e) {
    console.error("[api/admin/backup/pull]", e);
    return fail(e instanceof Error ? e.message : `Server error — pull failed. Detail: ${describeDbError(e)}`, 500);
  }
}
