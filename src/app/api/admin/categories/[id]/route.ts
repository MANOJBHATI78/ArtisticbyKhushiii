import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str, toPublicCategory } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { parseCategoryFields, uniqueCategorySlug } from "../../_lib";

export const dynamic = "force-dynamic";

function toAdminCategory(c: Parameters<typeof toPublicCategory>[0] & { published: boolean }, productCount: number) {
  return { ...toPublicCategory(c, productCount), published: c.published };
}

async function productCountOf(categoryId: string): Promise<number> {
  return db.product.count({ where: { categoryId } });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const category = await db.category.findUnique({ where: { id } });
    if (!category) return fail("Category not found.", 404);
    return ok(toAdminCategory(category, await productCountOf(id)));
  } catch (e) {
    console.error("[api/admin/categories/[id] GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return fail("Category not found.", 404);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const parsed = parseCategoryFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields: Record<string, unknown> = { ...parsed.fields };

    // ----- parent category -----
    if (has(body, "parentId")) {
      const parentId = fields.parentId as string | null;
      if (parentId === null) {
        fields.parentId = null;
      } else {
        if (parentId === id) return fail("A category cannot be its own parent.", 400);
        const parent = await db.category.findUnique({ where: { id: parentId } });
        if (!parent) return fail("Parent category not found.", 400);
      }
    }

    // ----- slug -----
    if (has(body, "slug")) {
      const slugInput = str(body.slug);
      const base = slugInput || str(body.name) || existing.name;
      fields.slug = await uniqueCategorySlug(base, id);
    }

    const category = await db.category.update({
      where: { id },
      data: fields as Prisma.CategoryUncheckedUpdateInput,
    });
    return ok({ category: toAdminCategory(category, await productCountOf(id)) });
  } catch (e) {
    console.error("[api/admin/categories/[id] PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return fail("Category not found.", 404);

    const productCount = await db.product.count({ where: { categoryId: id } });
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    if (productCount > 0 && !force) {
      return fail(
        `This category has ${productCount} product${productCount === 1 ? "" : "s"}. Move or delete them first, or pass force=true.`,
        409,
      );
    }

    // force=true → products (and their images/faqs via cascades) are removed too
    await db.category.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/categories/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
