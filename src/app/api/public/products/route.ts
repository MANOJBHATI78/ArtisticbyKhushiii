import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok, okCached } from "@/lib/server-utils";
import { paginated, pagination, toPublicProduct } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const PRODUCT_INCLUDE = {
  images: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = pagination(url.searchParams, 12, 48);
    const q = (url.searchParams.get("q") || "").trim();
    const categorySlug = (url.searchParams.get("category") || "").trim();
    const featured = url.searchParams.get("featured") === "1" || url.searchParams.get("featured") === "true";

    const where: Prisma.ProductWhereInput = { published: true };
    if (categorySlug) where.category = { slug: categorySlug };
    if (featured) where.featured = true;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { shortDescription: { contains: q } },
        { tags: { contains: q } },
        { sku: { contains: q } },
      ];
    }

    const [total, products] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take,
        include: PRODUCT_INCLUDE,
      }),
    ]);

    return okCached(paginated(products.map((p) => toPublicProduct(p)), total, page, pageSize));
  } catch (e) {
    console.error("[api/public/products]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
