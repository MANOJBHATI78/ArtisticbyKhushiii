import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { toPublicPage } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const page = await db.page.findFirst({ where: { slug, published: true } });
    if (!page) {
      return fail("Page not found.", 404);
    }
    return ok(toPublicPage(page));
  } catch (e) {
    console.error("[api/public/pages/[slug]]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
