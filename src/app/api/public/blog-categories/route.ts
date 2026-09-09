import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { visiblePostWhere } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cats, postCounts] = await Promise.all([
      db.blogCategory.findMany({
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      db.blogPost.groupBy({
        by: ["blogCategoryId"],
        where: visiblePostWhere(),
        _count: { _all: true },
      }),
    ]);
    const countMap = new Map(postCounts.map((c) => [c.blogCategoryId, c._count._all]));
    return ok(
      cats.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        displayOrder: c.displayOrder,
        postCount: countMap.get(c.id) ?? 0,
      })),
    );
  } catch (e) {
    console.error("[api/public/blog-categories]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
