import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { has, paginated, pagination, readJsonBody, str, toPublicBlogPost } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { applyBlogRules, parseBlogFields, uniqueBlogSlug } from "../_lib";

export const dynamic = "force-dynamic";

const BLOG_INCLUDE = {
  blogCategory: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.BlogPostInclude;

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const url = new URL(request.url);
    const { page, pageSize, skip, take } = pagination(url.searchParams, 20, 100);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "all").toLowerCase();

    const where: Prisma.BlogPostWhereInput = {};
    if (q) {
      where.OR = [{ title: { contains: q } }, { tags: { contains: q } }];
    }
    if (status === "published" || status === "draft" || status === "scheduled") {
      where.status = status.toUpperCase();
    }

    const [total, posts] = await Promise.all([
      db.blogPost.count({ where }),
      db.blogPost.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip,
        take,
        include: BLOG_INCLUDE,
      }),
    ]);

    return ok(paginated(posts.map((p) => toPublicBlogPost(p)), total, page, pageSize));
  } catch (e) {
    console.error("[api/admin/blogs GET]", e);
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
    if (!title) return fail("Blog title is required.", 400);

    const parsed = parseBlogFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields = { ...parsed.fields };

    // blogCategoryId: null → keep null; string → validate
    let blogCategoryId: string | null = null;
    if (typeof fields.blogCategoryId === "string") {
      const cat = await db.blogCategory.findUnique({ where: { id: fields.blogCategoryId } });
      if (!cat) return fail("Blog category not found.", 400);
      blogCategoryId = fields.blogCategoryId;
    }
    delete fields.blogCategoryId;

    // published-at rules + reading time estimation (missing/0 → auto-estimate)
    if (fields.readingTime === undefined) fields.readingTime = 0;
    applyBlogRules(fields, null);

    const slugInput = has(body, "slug") ? str(body.slug) : "";
    const slug = await uniqueBlogSlug(slugInput || title);

    const post = await db.blogPost.create({
      data: {
        ...(fields as Record<string, string | number | boolean | Date>),
        title,
        slug,
        blogCategoryId,
      } as Prisma.BlogPostUncheckedCreateInput,
    });

    const full = await db.blogPost.findUnique({ where: { id: post.id }, include: BLOG_INCLUDE });
    return ok({ blog: full ? toPublicBlogPost(full) : null });
  } catch (e) {
    console.error("[api/admin/blogs POST]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
