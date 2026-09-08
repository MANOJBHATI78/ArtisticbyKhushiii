import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { POST_ORDER, toFaq, toPublicBlogPost, toPublicProduct, visiblePostWhere } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const BLOG_INCLUDE = {
  blogCategory: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.BlogPostInclude;

const PRODUCT_INCLUDE = {
  images: true,
  category: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.ProductInclude;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const post = await db.blogPost.findFirst({
      where: { slug, ...visiblePostWhere() },
      include: BLOG_INCLUDE,
    });
    if (!post) {
      return fail("Blog post not found.", 404);
    }

    const [faqRows, relatedProducts] = await Promise.all([
      db.faq.findMany({
        where: { entityType: "BLOG", entityId: post.id, published: true },
        orderBy: { displayOrder: "asc" },
      }),
      (async () => {
        let productSlugs: string[] = [];
        try {
          const parsed = JSON.parse(post.relatedProductSlugs || "[]");
          if (Array.isArray(parsed)) productSlugs = parsed.filter((x): x is string => typeof x === "string");
        } catch {
          productSlugs = [];
        }
        productSlugs = productSlugs.slice(0, 3);
        if (productSlugs.length === 0) return [];
        const rows = await db.product.findMany({
          where: { slug: { in: productSlugs }, published: true },
          include: PRODUCT_INCLUDE,
        });
        const bySlug = new Map(rows.map((r) => [r.slug, r]));
        return productSlugs
          .map((s) => bySlug.get(s))
          .filter((r): r is NonNullable<typeof r> => Boolean(r));
      })(),
    ]);

    // ----- related blogs: same category first, fallback to latest -----
    let relatedBlogs: Prisma.BlogPostGetPayload<{ include: typeof BLOG_INCLUDE }>[] = [];
    if (post.blogCategoryId) {
      relatedBlogs = await db.blogPost.findMany({
        where: { ...visiblePostWhere(), id: { not: post.id }, blogCategoryId: post.blogCategoryId },
        orderBy: POST_ORDER,
        take: 3,
        include: BLOG_INCLUDE,
      });
    }
    if (relatedBlogs.length < 3) {
      const excludeIds = [post.id, ...relatedBlogs.map((b) => b.id)];
      const fill = await db.blogPost.findMany({
        where: { ...visiblePostWhere(), id: { notIn: excludeIds } },
        orderBy: POST_ORDER,
        take: 3 - relatedBlogs.length,
        include: BLOG_INCLUDE,
      });
      relatedBlogs = [...relatedBlogs, ...fill];
    }

    return ok({
      post: toPublicBlogPost(post),
      faqs: faqRows.map(toFaq),
      relatedProducts: relatedProducts.map((p) => toPublicProduct(p)),
      relatedBlogs: relatedBlogs.map((b) => toPublicBlogPost(b)),
    });
  } catch (e) {
    console.error("[api/public/blogs/[slug]]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
