import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import {
  POST_ORDER,
  toFaq,
  toPublicBlogPost,
  toPublicCategory,
  toPublicProduct,
  visiblePostWhere,
} from "@/lib/serializers";

export const dynamic = "force-dynamic";

const PRODUCT_INCLUDE = {
  images: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const category = await db.category.findFirst({ where: { slug, published: true } });
    if (!category) {
      return fail("Category not found.", 404);
    }

    const [products, faqRows, siblingRows, blogRows, productCounts] = await Promise.all([
      db.product.findMany({
        where: { categoryId: category.id, published: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        include: PRODUCT_INCLUDE,
      }),
      db.faq.findMany({
        where: { entityType: "CATEGORY", entityId: category.id, published: true },
        orderBy: { displayOrder: "asc" },
      }),
      // same-level published siblings, excluding self, ordered by displayOrder
      db.category.findMany({
        where: { published: true, id: { not: category.id }, parentId: category.parentId },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        take: 4,
      }),
      // prefer posts mentioning the category, fallback to latest
      db.blogPost.findMany({
        where: {
          ...visiblePostWhere(),
          OR: [
            { title: { contains: category.name } },
            { excerpt: { contains: category.name } },
            { tags: { contains: category.name } },
            { content: { contains: category.name } },
          ],
        },
        orderBy: POST_ORDER,
        take: 3,
        include: { blogCategory: { select: { id: true, name: true, slug: true } } },
      }),
      db.product.groupBy({
        by: ["categoryId"],
        where: { published: true },
        _count: { _all: true },
      }),
    ]);

    // fill related categories up to 4 with other published categories
    let relatedCategories = siblingRows;
    if (relatedCategories.length < 4) {
      const excludeIds = [category.id, ...relatedCategories.map((c) => c.id)];
      const fill = await db.category.findMany({
        where: { published: true, id: { notIn: excludeIds } },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        take: 4 - relatedCategories.length,
      });
      relatedCategories = [...relatedCategories, ...fill];
    }

    // fill related blogs up to 3 with the latest visible posts
    let relatedBlogs = blogRows;
    if (relatedBlogs.length < 3) {
      const excludeIds = relatedBlogs.map((b) => b.id);
      const fill = await db.blogPost.findMany({
        where: { ...visiblePostWhere(), id: { notIn: excludeIds } },
        orderBy: POST_ORDER,
        take: 3 - relatedBlogs.length,
        include: { blogCategory: { select: { id: true, name: true, slug: true } } },
      });
      relatedBlogs = [...relatedBlogs, ...fill];
    }

    const countMap = new Map(productCounts.map((c) => [c.categoryId, c._count._all]));

    return ok({
      category: toPublicCategory(category, countMap.get(category.id) ?? 0),
      products: products.map((p) => toPublicProduct(p)),
      faqs: faqRows.map(toFaq),
      relatedCategories: relatedCategories.map((c) => toPublicCategory(c, countMap.get(c.id) ?? 0)),
      relatedBlogs: relatedBlogs.map((b) => toPublicBlogPost(b)),
    });
  } catch (e) {
    console.error("[api/public/categories/[slug]]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
