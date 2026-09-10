import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { toPublicCategory } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cats, productCounts] = await Promise.all([
      db.category.findMany({
        where: { published: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      db.product.groupBy({
        by: ["categoryId"],
        where: { published: true },
        _count: { _all: true },
      }),
    ]);
    const countMap = new Map(productCounts.map((c) => [c.categoryId, c._count._all]));
    return ok(cats.map((c) => toPublicCategory(c, countMap.get(c.id) ?? 0)));
  } catch (e) {
    console.error("[api/public/categories]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
