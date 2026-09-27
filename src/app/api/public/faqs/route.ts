import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { toFaq } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const faqs = await db.faq.findMany({
      where: { entityType: "GENERAL", published: true },
      orderBy: { displayOrder: "asc" },
    });
    return ok(faqs.map(toFaq));
  } catch (e) {
    console.error("[api/public/faqs]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
