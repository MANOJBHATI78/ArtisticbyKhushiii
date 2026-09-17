import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str, toLanding } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { parseLandingFields, uniqueLandingSlug } from "../_lib";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();

    const landings = await db.landingPage.findMany({
      where: q
        ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }, { focusKeyword: { contains: q } }] }
        : undefined,
      orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
    });
    return ok(landings.map(toLanding));
  } catch (e) {
    console.error("[api/admin/landing GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const title = str(body.title);
    if (!title) return fail("Landing title is required.", 400);

    const parsed = parseLandingFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields = parsed.fields;

    const slugInput = has(body, "slug") ? str(body.slug) : "";
    if (slugInput && !SLUG_RE.test(slugInput)) {
      return fail("Slug can only contain lowercase letters, numbers and hyphens (e.g. diwali-gifting).", 400);
    }
    const slug = await uniqueLandingSlug(slugInput || title);

    const landing = await db.landingPage.create({
      data: {
        ...(fields as Record<string, string | number | boolean>),
        title,
        slug,
        bodyHtml: (fields.bodyHtml as string) ?? "",
        faqsJson: (fields.faqsJson as string) ?? "[]",
        productIds: (fields.productIds as string) ?? "[]",
        categoryIds: (fields.categoryIds as string) ?? "[]",
        published: (fields.published as boolean) ?? false,
      },
    });
    return ok({ landing: toLanding(landing) });
  } catch (e) {
    console.error("[api/admin/landing POST]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
