import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { has, paginated, pagination, readJsonBody, str, toPublicProduct } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { parseImages, parseProductFields, uniqueProductSlug } from "../_lib";

export const dynamic = "force-dynamic";

const PRODUCT_INCLUDE = {
  images: true,
  category: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.ProductInclude;

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const url = new URL(request.url);
    const { page, pageSize, skip, take } = pagination(url.searchParams, 50, 100);
    const q = (url.searchParams.get("q") || "").trim();
    const categorySlug = (url.searchParams.get("category") || "").trim();
    const status = (url.searchParams.get("status") || "all").toLowerCase();

    const where: Prisma.ProductWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { shortDescription: { contains: q } },
      ];
    }
    if (categorySlug) where.category = { slug: categorySlug };
    if (status === "published") where.published = true;
    else if (status === "draft") where.published = false;
    else if (status === "featured") where.featured = true;

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

    return ok(paginated(products.map((p) => toPublicProduct(p)), total, page, pageSize));
  } catch (e) {
    console.error("[api/admin/products GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    // ----- required fields -----
    const name = str(body.name);
    if (!name) return fail("Product name is required.", 400);
    const categoryId = str(body.categoryId);
    if (!categoryId) return fail("A category is required for the product.", 400);

    // ----- optional fields (only provided ones) -----
    const parsed = parseProductFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) return fail("Category not found.", 400);

    const imagesResult = parseImages(body.images);
    if (!imagesResult.ok) return fail(imagesResult.error, 400);

    // ----- slug -----
    const slugInput = has(body, "slug") ? str(body.slug) : "";
    const slug = await uniqueProductSlug(slugInput || name);

    // ----- build create data with sensible defaults -----
    const defaults: Record<string, string | number | boolean> = {
      sku: "",
      subcategory: "",
      shortDescription: "",
      longDescription: "",
      highlights: "",
      customizationOptions: "",
      size: "",
      material: "",
      colour: "",
      occasion: "",
      careInstructions: "",
      tags: "",
      featured: false,
      published: true,
      displayOrder: 0,
      relatedProductIds: "[]",
      seoTitle: "",
      metaDescription: "",
      focusKeyword: "",
      secondaryKeywords: "",
      ogTitle: "",
      ogDescription: "",
      canonicalUrl: "",
    };
    const data: Record<string, unknown> = { ...defaults, ...parsed.fields, name, categoryId, slug };
    if (imagesResult.fields.length > 0) {
      data.images = {
        create: imagesResult.fields.map(({ id: _id, ...img }) => img),
      };
    }

    const product = await db.product.create({ data: data as Prisma.ProductUncheckedCreateInput });

    const full = await db.product.findUnique({
      where: { id: product.id },
      include: PRODUCT_INCLUDE,
    });
    return ok({ product: full ? toPublicProduct(full) : null });
  } catch (e) {
    console.error("[api/admin/products POST]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
