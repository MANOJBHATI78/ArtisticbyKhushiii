import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str, toPublicPage } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { parsePageFields, uniquePageSlug } from "../_lib";

export const dynamic = "force-dynamic";

/** PublicPage + displayOrder (needed by the admin UI). */
function toAdminPage(p: Parameters<typeof toPublicPage>[0] & { displayOrder: number }) {
  return { ...toPublicPage(p), displayOrder: p.displayOrder };
}

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const pages = await db.page.findMany({ orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }] });
    return ok(pages.map(toAdminPage));
  } catch (e) {
    console.error("[api/admin/pages GET]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const title = str(body.title);
    if (!title) return fail("Page title is required.", 400);

    const parsed = parsePageFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields = parsed.fields;

    const slugInput = has(body, "slug") ? str(body.slug) : "";
    const slug = await uniquePageSlug(slugInput || title);

    const page = await db.page.create({
      data: {
        ...(fields as Record<string, string | number | boolean>),
        title,
        slug,
        content: (fields.content as string) ?? "",
      },
    });
    return ok({ page: toAdminPage(page) });
  } catch (e) {
    console.error("[api/admin/pages POST]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
