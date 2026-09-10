import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str, toPublicBlogPost } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";
import { applyBlogRules, parseBlogFields, uniqueBlogSlug } from "../../_lib";

export const dynamic = "force-dynamic";

const BLOG_INCLUDE = {
  blogCategory: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.BlogPostInclude;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const post = await db.blogPost.findUnique({ where: { id }, include: BLOG_INCLUDE });
    if (!post) return fail("Blog post not found.", 404);
    return ok(toPublicBlogPost(post));
  } catch (e) {
    console.error("[api/admin/blogs/[id] GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) return fail("Blog post not found.", 404);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const parsed = parseBlogFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields: Record<string, unknown> = { ...parsed.fields };

    // ----- blog category -----
    if (has(body, "blogCategoryId")) {
      const blogCategoryId = fields.blogCategoryId as string | null;
      if (blogCategoryId === null) {
        fields.blogCategoryId = null;
      } else {
        const cat = await db.blogCategory.findUnique({ where: { id: blogCategoryId } });
        if (!cat) return fail("Blog category not found.", 400);
      }
    }

    // publishedAt / readingTime rules relative to the existing row
    applyBlogRules(
      fields as Parameters<typeof applyBlogRules>[0],
      existing as unknown as Parameters<typeof applyBlogRules>[1],
    );

    // ----- slug -----
    if (has(body, "slug")) {
      const slugInput = str(body.slug);
      const base = slugInput || str(body.title) || existing.title;
      fields.slug = await uniqueBlogSlug(base, id);
    }

    const post = await db.blogPost.update({
      where: { id },
      data: fields as Prisma.BlogPostUncheckedUpdateInput,
    });

    const full = await db.blogPost.findUnique({ where: { id: post.id }, include: BLOG_INCLUDE });
    return ok({ blog: full ? toPublicBlogPost(full) : null });
  } catch (e) {
    console.error("[api/admin/blogs/[id] PUT]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await params;
    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) return fail("Blog post not found.", 404);

    await db.blogPost.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/blogs/[id] DELETE]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
