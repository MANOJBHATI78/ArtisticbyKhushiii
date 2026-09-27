import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str, toPublicProduct } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { parseImages, parseProductFields, uniqueProductSlug } from "../../_lib";

export const dynamic = "force-dynamic";

const PRODUCT_INCLUDE = {
  images: true,
  category: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.ProductInclude;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const product = await db.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!product) return fail("Product not found.", 404);
    return ok(toPublicProduct(product));
  } catch (e) {
    console.error("[api/admin/products/[id] GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.product.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!existing) return fail("Product not found.", 404);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const parsed = parseProductFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const data: Record<string, unknown> = { ...parsed.fields };

    // ----- category validation -----
    if (typeof data.categoryId === "string") {
      const category = await db.category.findUnique({ where: { id: data.categoryId } });
      if (!category) return fail("Category not found.", 400);
    }

    // ----- slug -----
    if (has(body, "slug")) {
      const slugInput = str(body.slug);
      const base = slugInput || str(body.name) || existing.name;
      data.slug = await uniqueProductSlug(base, id);
    }

    await db.product.update({ where: { id }, data: data as Prisma.ProductUncheckedUpdateInput });

    // ----- replace images array if provided -----
    if (has(body, "images")) {
      const imagesResult = parseImages(body.images);
      if (!imagesResult.ok) return fail(imagesResult.error, 400);

      const existingIds = new Set(existing.images.map((img) => img.id));
      const keepIds = imagesResult.fields
        .map((img) => img.id)
        .filter((imgId): imgId is string => Boolean(imgId));
      const toDelete = [...existingIds].filter((imgId) => !keepIds.includes(imgId));
      if (toDelete.length > 0) {
        await db.productImage.deleteMany({ where: { id: { in: toDelete } } });
      }
      for (const img of imagesResult.fields) {
        const imgData = {
          url: img.url,
          alt: img.alt,
          caption: img.caption,
          isFeatured: img.isFeatured,
          displayOrder: img.displayOrder,
        };
        if (img.id && existingIds.has(img.id)) {
          await db.productImage.update({ where: { id: img.id }, data: imgData });
        } else {
          await db.productImage.create({ data: { ...imgData, productId: id } });
        }
      }
    }

    const full = await db.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    return ok({ product: full ? toPublicProduct(full) : null });
  } catch (e) {
    console.error("[api/admin/products/[id] PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) return fail("Product not found.", 404);

    await db.product.delete({ where: { id } }); // ProductImage rows cascade
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/products/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
