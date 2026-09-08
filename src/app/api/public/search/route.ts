import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { POST_ORDER, toPublicBlogPost, toPublicCategory, toPublicProduct, visiblePostWhere } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const PRODUCT_INCLUDE = {
  images: true,
  category: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.ProductInclude;

const BLOG_INCLUDE = {
  blogCategory: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.BlogPostInclude;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    if (!q) {
      return ok({ products: [], categories: [], blogs: [], query: q });
    }

    const [products, categories, blogs, productCounts] = await Promise.all([
      db.product.findMany({
        where: {
          published: true,
          OR: [
            { name: { contains: q } },
            { shortDescription: { contains: q } },
            { tags: { contains: q } },
          ],
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        take: 8,
        include: PRODUCT_INCLUDE,
      }),
      db.category.findMany({
        where: {
          published: true,
          OR: [{ name: { contains: q } }, { shortDescription: { contains: q } }],
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        take: 8,
      }),
      db.blogPost.findMany({
        where: {
          ...visiblePostWhere(),
          OR: [
            { title: { contains: q } },
            { excerpt: { contains: q } },
            { tags: { contains: q } },
          ],
        },
        orderBy: POST_ORDER,
        take: 8,
        include: BLOG_INCLUDE,
      }),
      db.product.groupBy({
        by: ["categoryId"],
        where: { published: true },
        _count: { _all: true },
      }),
    ]);

    const countMap = new Map(productCounts.map((c) => [c.categoryId, c._count._all]));

    return ok({
      products: products.map((p) => toPublicProduct(p)),
      categories: categories.map((c) => toPublicCategory(c, countMap.get(c.id) ?? 0)),
      blogs: blogs.map((b) => toPublicBlogPost(b)),
      query: q,
    });
  } catch (e) {
    console.error("[api/public/search]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
