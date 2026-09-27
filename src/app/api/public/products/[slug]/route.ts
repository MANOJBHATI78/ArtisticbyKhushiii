import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
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
} as const satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

const BLOG_INCLUDE = {
  blogCategory: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.BlogPostInclude;

type BlogRow = Prisma.BlogPostGetPayload<{ include: typeof BLOG_INCLUDE }>;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await db.product.findFirst({
      where: { slug, published: true },
      include: PRODUCT_INCLUDE,
    });
    if (!product) {
      return fail("Product not found.", 404);
    }

    const [faqRows, categoryRow, productCounts] = await Promise.all([
      db.faq.findMany({
        where: { entityType: "PRODUCT", entityId: product.id, published: true },
        orderBy: { displayOrder: "asc" },
      }),
      db.category.findUnique({ where: { id: product.categoryId } }),
      db.product.groupBy({
        by: ["categoryId"],
        where: { published: true },
        _count: { _all: true },
      }),
    ]);

    // ----- related products: explicit IDs first, fill with same category -----
    let relatedIds: string[] = [];
    try {
      const parsed = JSON.parse(product.relatedProductIds || "[]");
      if (Array.isArray(parsed)) relatedIds = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      relatedIds = [];
    }

    let relatedProducts: ProductRow[] = [];
    if (relatedIds.length > 0) {
      const rows = await db.product.findMany({
        where: { id: { in: relatedIds }, published: true },
        include: PRODUCT_INCLUDE,
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      relatedProducts = relatedIds
        .map((id) => byId.get(id))
        .filter((r): r is ProductRow => Boolean(r));
    }
    if (relatedProducts.length < 4) {
      const excludeIds = [product.id, ...relatedProducts.map((r) => r.id)];
      const fill = await db.product.findMany({
        where: { published: true, categoryId: product.categoryId, id: { notIn: excludeIds } },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        take: 4 - relatedProducts.length,
        include: PRODUCT_INCLUDE,
      });
      relatedProducts = [...relatedProducts, ...fill].slice(0, 4);
    }

    // ----- related blogs: match product name / category name, fallback latest -----
    const categoryName = product.category?.name ?? "";
    const matchConditions: Prisma.BlogPostWhereInput[] = [];
    if (product.name) {
      matchConditions.push(
        { title: { contains: product.name } },
        { tags: { contains: product.name } },
        { content: { contains: product.name } },
      );
    }
    if (categoryName) {
      matchConditions.push(
        { title: { contains: categoryName } },
        { tags: { contains: categoryName } },
        { content: { contains: categoryName } },
      );
    }
    let relatedBlogs: BlogRow[] = matchConditions.length
      ? await db.blogPost.findMany({
          where: { ...visiblePostWhere(), OR: matchConditions },
          orderBy: POST_ORDER,
          take: 3,
          include: BLOG_INCLUDE,
        })
      : [];
    if (relatedBlogs.length < 3) {
      const excludeIds = relatedBlogs.map((b) => b.id);
      const fill = await db.blogPost.findMany({
        where: { ...visiblePostWhere(), id: { notIn: excludeIds } },
        orderBy: POST_ORDER,
        take: 3 - relatedBlogs.length,
        include: BLOG_INCLUDE,
      });
      relatedBlogs = [...relatedBlogs, ...fill];
    }

    const countMap = new Map(productCounts.map((c) => [c.categoryId, c._count._all]));

    return ok({
      product: toPublicProduct(product),
      faqs: faqRows.map(toFaq),
      relatedProducts: relatedProducts.map((p) => toPublicProduct(p)),
      relatedBlogs: relatedBlogs.map((b) => toPublicBlogPost(b)),
      category: categoryRow ? toPublicCategory(categoryRow, countMap.get(categoryRow.id) ?? 0) : null,
    });
  } catch (e) {
    console.error("[api/public/products/[slug]]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
