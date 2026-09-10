import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { requireAdmin } from "../_guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const sections = await db.homepageSection.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return ok(
      sections.map((s) => ({
        sectionKey: s.sectionKey,
        heading: s.heading,
        subheading: s.subheading,
        body: s.body,
        imageUrl: s.imageUrl,
        ctaText: s.ctaText,
        ctaUrl: s.ctaUrl,
        ctaText2: s.ctaText2,
        ctaUrl2: s.ctaUrl2,
        itemsJson: s.itemsJson,
        visible: s.visible,
        displayOrder: s.displayOrder,
      })),
    );
  } catch (e) {
    console.error("[api/admin/homepage GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
