import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { toLead } from "@/lib/serializers";
import { requireAdmin } from "../_guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const [
      totalProducts,
      publishedProducts,
      draftProducts,
      featuredProducts,
      totalCategories,
      publishedBlogs,
      draftBlogs,
      totalLeads,
      newLeads,
      convertedLeads,
      totalFaqs,
      totalPages,
      recentLeadRows,
      recentProductRows,
      recentBlogRows,
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { published: true } }),
      db.product.count({ where: { published: false } }),
      db.product.count({ where: { featured: true } }),
      db.category.count(),
      db.blogPost.count({ where: { status: "PUBLISHED" } }),
      db.blogPost.count({ where: { status: "DRAFT" } }),
      db.lead.count(),
      db.lead.count({ where: { status: "NEW" } }),
      db.lead.count({ where: { status: "CONVERTED" } }),
      db.faq.count(),
      db.page.count(),
      db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      db.product.findMany({ orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, name: true, slug: true, published: true, updatedAt: true } }),
      db.blogPost.findMany({ orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, slug: true, status: true, updatedAt: true } }),
    ]);

    return ok({
      totalProducts,
      publishedProducts,
      draftProducts,
      featuredProducts,
      totalCategories,
      publishedBlogs,
      draftBlogs,
      totalLeads,
      newLeads,
      convertedLeads,
      totalFaqs,
      totalPages,
      recentLeads: recentLeadRows.map(toLead),
      recentProducts: recentProductRows.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        published: p.published,
        updatedAt: p.updatedAt.toISOString(),
      })),
      recentBlogs: recentBlogRows.map((b) => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        status: b.status,
        updatedAt: b.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[api/admin/dashboard]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
