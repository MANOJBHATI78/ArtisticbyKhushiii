import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { parseIdList, parseLandingFaqs, toLanding, toPublicProduct } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const landing = await db.landingPage.findFirst({ where: { slug, published: true } });
    if (!landing) {
      return fail("Landing page not found.", 404);
    }

    // Resolve hand-picked products (published only), PRESERVING the landing's order.
    const ids = parseIdList(landing.productIds);
    let products: ReturnType<typeof toPublicProduct>[] = [];
    if (ids.length > 0) {
      const rows = await db.product.findMany({
        where: { id: { in: ids }, published: true },
        include: { images: true, category: { select: { id: true, name: true, slug: true } } },
      });
      const byId = new Map(rows.map((p) => [p.id, p]));
      products = ids
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => toPublicProduct(p));
    }

    const faqs = parseLandingFaqs(landing.faqsJson);

    // Fire-and-forget view counter — never block or fail the response for it.
    db.landingPage
      .update({ where: { id: landing.id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    return ok({
      landing: toLanding(landing),
      products,
      faqs: faqs.map((f, i) => ({
        id: `faq-${i}`,
        question: f.question,
        answer: f.answer,
        entityType: "LANDING",
        entityId: null,
        displayOrder: i,
        published: true,
      })),
    });
  } catch (e) {
    console.error("[api/public/landing/[slug]]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
