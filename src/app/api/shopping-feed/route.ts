import { db, describeDbError } from "@/lib/db";
import { getSettings } from "@/lib/server-utils";

/**
 * GET /api/shopping-feed — Google Merchant Center product feed (RSS 2.0,
 * g: namespace). Submit this URL in Merchant Center → Products → Feeds.
 *
 * Only PUBLISHED products with a price set are included (Google disapproves
 * items without a price). Turn the feed off any time from
 * Admin → Site Settings → Google Shopping.
 */
export const revalidate = 3600;

const PRODUCTION_URL = "https://artisticbykhushiii.com";

function xmlEscape(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(v: string): string {
  return `<![CDATA[${v.replace(/]]>/g, "]]&gt;")}]]>`;
}

export async function GET() {
  try {
    const settings = await getSettings();
    const base = (settings.siteUrl || "").trim().replace(/\/+$/, "") || PRODUCTION_URL;
    const brand = (settings.brandName || "Artistic by Khushiii").trim();
    const enabled = (settings.shoppingFeedEnabled || "1") !== "0";

    const items: string[] = [];
    if (enabled) {
      const products = await db.product.findMany({
        where: { published: true },
        include: { images: true, category: true },
        orderBy: { createdAt: "asc" },
      });

      for (const p of products) {
        const priceDigits = (p.price || "").replace(/[^\d.]/g, "");
        if (!priceDigits) continue; // enquiry-only pieces can't be shopping listings

        const images = (p.images ?? [])
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder);
        const featured = images.find((i) => i.isFeatured) ?? images[0];
        if (!featured) continue; // Google requires an image

        const description = (p.shortDescription || p.longDescription || p.name)
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000);
        const extraImages = images.filter((i) => i.url !== featured.url).slice(0, 10);

        items.push(`    <item>
      <g:id>${xmlEscape(p.slug)}</g:id>
      <g:title>${xmlEscape(p.name.slice(0, 150))}</g:title>
      <g:description>${cdata(description)}</g:description>
      <g:link>${xmlEscape(`${base}/product/${p.slug}`)}</g:link>
      <g:image_link>${xmlEscape(featured.url.startsWith("http") ? featured.url : `${base}${featured.url}`)}</g:image_link>
${extraImages.map((i) => `      <g:additional_image_link>${xmlEscape(i.url.startsWith("http") ? i.url : `${base}${i.url}`)}</g:additional_image_link>`).join("\n")}
      <g:availability>in_stock</g:availability>
      <g:price>${xmlEscape(`${priceDigits} INR`)}</g:price>
      <g:brand>${xmlEscape(brand)}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>${p.sku ? "yes" : "no"}</g:identifier_exists>${p.sku ? `\n      <g:mpn>${xmlEscape(p.sku)}</g:mpn>` : ""}
      <g:item_group_id>${xmlEscape(p.category?.slug ?? "collection")}</g:item_group_id>
    </item>`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(brand)} — Product catalogue</title>
    <link>${xmlEscape(base)}</link>
    <description>${xmlEscape((settings.defaultMetaDescription || "Handcrafted personalized resin art, nameplates, décor and gifts.").slice(0, 500))}</description>
${enabled ? items.join("\n") : ""}
  </channel>
</rss>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    });
  } catch (e) {
    console.error("[api/shopping-feed]", e);
    // A broken feed must never take the site down — return an empty valid feed.
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Feed temporarily unavailable</title><link>${PRODUCTION_URL}</link><description>${xmlEscape(describeDbError(e))}</description></channel></rss>`,
      { status: 200, headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
    );
  }
}
