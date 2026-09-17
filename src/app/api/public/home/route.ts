import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import {
  POST_ORDER,
  toFaq,
  toPublicBlogPost,
  toPublicCategory,
  toPublicProduct,
  visiblePostWhere,
} from "@/lib/serializers";
import type { HomepageSection } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRODUCT_INCLUDE = {
  images: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

export async function GET() {
  try {
    const [sections, cats, prods, blogs, faqRows, productCounts] = await Promise.all([
      db.homepageSection.findMany(),
      db.category.findMany({
        where: { published: true, featured: true },
        orderBy: { displayOrder: "asc" },
      }),
      db.product.findMany({
        where: { published: true, featured: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        include: PRODUCT_INCLUDE,
      }),
      db.blogPost.findMany({
        where: visiblePostWhere(),
        orderBy: POST_ORDER,
        take: 3,
        include: { blogCategory: { select: { id: true, name: true, slug: true } } },
      }),
      db.faq.findMany({
        where: { entityType: "GENERAL", published: true },
        orderBy: { displayOrder: "asc" },
      }),
      db.product.groupBy({
        by: ["categoryId"],
        where: { published: true },
        _count: { _all: true },
      }),
    ]);

    const countMap = new Map(productCounts.map((c) => [c.categoryId, c._count._all]));
    const sectionMap = new Map(sections.map((s) => [s.sectionKey, s]));

    const toSection = (key: string): HomepageSection | null => {
      const s = sectionMap.get(key);
      if (!s) return null;
      return {
        sectionKey: s.sectionKey,
        heading: s.heading,
        subheading: s.subheading,
        body: s.body,
        imageUrl: s.imageUrl,
        mobileImageUrl: s.mobileImageUrl ?? "",
        ctaText: s.ctaText,
        ctaUrl: s.ctaUrl,
        ctaText2: s.ctaText2,
        ctaUrl2: s.ctaUrl2,
        itemsJson: s.itemsJson,
        visible: s.visible,
        displayOrder: s.displayOrder,
      };
    };

    return ok({
      hero: toSection("hero"),
      brandIntro: toSection("brand_intro"),
      featuredCategories: cats.map((c) => toPublicCategory(c, countMap.get(c.id) ?? 0)),
      featuredProducts: prods.map((p) => toPublicProduct(p)),
      whyChoose: toSection("why_choose"),
      customOrders: toSection("custom_orders"),
      memoryPreservation: toSection("memory_preservation"),
      latestBlogs: blogs.map((b) => toPublicBlogPost(b)),
      faqs: faqRows.map(toFaq),
      finalCta: toSection("final_cta"),
    });
  } catch (e) {
    console.error("[api/public/home]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
