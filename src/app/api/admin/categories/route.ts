import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str, toPublicCategory } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { parseCategoryFields, uniqueCategorySlug } from "../_lib";

export const dynamic = "force-dynamic";

/** PublicCategory shape + `published` flag (needed by the admin UI). */
function toAdminCategory(
  c: Parameters<typeof toPublicCategory>[0] & { published: boolean },
  productCount: number,
) {
  return { ...toPublicCategory(c, productCount), published: c.published };
}

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const [categories, productCounts] = await Promise.all([
      db.category.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
      db.product.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    ]);
    const countMap = new Map(productCounts.map((c) => [c.categoryId, c._count._all]));
    return ok(categories.map((c) => toAdminCategory(c, countMap.get(c.id) ?? 0)));
  } catch (e) {
    console.error("[api/admin/categories GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const name = str(body.name);
    if (!name) return fail("Category name is required.", 400);

    const parsed = parseCategoryFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields = parsed.fields;

    // parentId: "" → null; validate existence when set
    let parentId: string | null = null;
    if (typeof fields.parentId === "string") {
      const parent = await db.category.findUnique({ where: { id: fields.parentId } });
      if (!parent) return fail("Parent category not found.", 400);
      parentId = fields.parentId;
    }
    delete fields.parentId;

    const slugInput = has(body, "slug") ? str(body.slug) : "";
    const slug = await uniqueCategorySlug(slugInput || name);

    const category = await db.category.create({
      data: { ...(fields as Record<string, string | number | boolean>), name, slug, parentId },
    });

    return ok({ category: toAdminCategory(category, 0) });
  } catch (e) {
    console.error("[api/admin/categories POST]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
