import { db } from "@/lib/db";
import { getSettings } from "@/lib/server-utils";
import { visiblePostWhere } from "@/lib/serializers";

export const dynamic = "force-dynamic";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  try {
    const settings = await getSettings();
    const base = (settings.siteUrl || "").trim().replace(/\/+$/, "");

    const [categories, products, blogs, pages] = await Promise.all([
      db.category.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
      db.product.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
      db.blogPost.findMany({ where: visiblePostWhere(), select: { slug: true, updatedAt: true } }),
      db.page.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    ]);

    type Entry = { loc: string; lastmod?: Date };
    const entries: Entry[] = [
      { loc: `${base}/` },
      { loc: `${base}/products` },
      { loc: `${base}/categories` },
      { loc: `${base}/blog` },
      { loc: `${base}/about` },
      { loc: `${base}/contact` },
      { loc: `${base}/faq` },
      { loc: `${base}/services` },
    ];
    for (const c of categories) entries.push({ loc: `${base}/category/${c.slug}`, lastmod: c.updatedAt });
    for (const p of products) entries.push({ loc: `${base}/product/${p.slug}`, lastmod: p.updatedAt });
    for (const b of blogs) entries.push({ loc: `${base}/blog/${b.slug}`, lastmod: b.updatedAt });
    for (const p of pages) entries.push({ loc: `${base}/page/${p.slug}`, lastmod: p.updatedAt });

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      entries
        .map(
          (e) =>
            `  <url><loc>${xmlEscape(e.loc)}</loc>${
              e.lastmod ? `<lastmod>${e.lastmod.toISOString()}</lastmod>` : ""
            }</url>`,
        )
        .join("\n") +
      `\n</urlset>\n`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("[api/sitemap]", e);
    return new Response("Error generating sitemap", { status: 500 });
  }
}
