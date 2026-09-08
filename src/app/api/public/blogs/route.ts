import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { paginated, pagination, toPublicBlogPost, visiblePostWhere, POST_ORDER } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const BLOG_INCLUDE = {
  blogCategory: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.BlogPostInclude;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, pageSize, skip, take } = pagination(url.searchParams, 9, 48);
    const q = (url.searchParams.get("q") || "").trim();
    const tagParam = (url.searchParams.get("tag") || "").trim();
    const cat = (url.searchParams.get("cat") || "").trim();

    const where: Prisma.BlogPostWhereInput = visiblePostWhere();
    if (q) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { title: { contains: q } },
            { excerpt: { contains: q } },
            { tags: { contains: q } },
          ],
        },
      ];
    }
    if (tagParam) {
      const tags = tagParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        where.AND = [
          ...(where.AND ?? []),
          { OR: tags.map((t) => ({ tags: { contains: t } })) },
        ];
      }
    }
    if (cat) {
      where.blogCategory = { slug: cat };
    }

    const [total, posts] = await Promise.all([
      db.blogPost.count({ where }),
      db.blogPost.findMany({
        where,
        orderBy: POST_ORDER,
        skip,
        take,
        include: BLOG_INCLUDE,
      }),
    ]);

    return ok(paginated(posts.map((p) => toPublicBlogPost(p)), total, page, pageSize));
  } catch (e) {
    console.error("[api/public/blogs]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
