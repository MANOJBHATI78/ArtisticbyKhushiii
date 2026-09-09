import { getSettings } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    const base = (settings.siteUrl || "").trim().replace(/\/+$/, "");

    const txt =
      `User-agent: *\n` +
      `Allow: /\n` +
      `Disallow: /api/\n` +
      `Disallow: /admin\n` +
      `\n` +
      `Sitemap: ${base}/api/sitemap\n`;

    return new Response(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("[api/robots]", e);
    return new Response("Error generating robots.txt", { status: 500 });
  }
}
