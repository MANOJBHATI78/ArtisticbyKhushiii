import QRCode from "qrcode";
import { getSettings, fail, rateLimit } from "@/lib/server-utils";

/**
 * GET /api/qr?path=/product/slug&size=512
 *
 * Renders a brand-coloured QR code (chocolate on white) pointing at any
 * public page on this site. Used by the admin panel for product QR downloads
 * and the printable exhibition sheet — visitors scan a code at a craft fair
 * and land straight on the product page.
 *
 * The absolute URL is built from the `siteUrl` setting when present (so codes
 * stay correct on the live domain) and falls back to the request origin.
 */

export const dynamic = "force-dynamic";

// Only allow internal paths — this endpoint must never become an open QR
// generator for arbitrary third-party URLs.
function isSafePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("..");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get("path") || "/";
    const size = Math.min(Math.max(Number(url.searchParams.get("size")) || 512, 128), 1024);

    if (!isSafePath(path)) {
      return fail("Invalid path");
    }
    if (!Number.isFinite(size)) {
      return fail("Invalid size");
    }

    // Generous limit: the exhibition sheet requests ~25 codes at once.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local";
    if (!rateLimit(`qr:${ip}`, 240, 60_000)) {
      return fail("Too many QR requests — please try again in a minute.", 429);
    }

    const settings = await getSettings();
    const base = (settings.siteUrl || url.origin).replace(/\/+$/, "");
    const target = `${base}/#${path}`;

    const png = await QRCode.toBuffer(target, {
      type: "png",
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#3E2515", // brand espresso
        light: "#FFFFFF", // pure white scans best
      },
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Disposition": `inline; filename="qr-${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.png"`,
      },
    });
  } catch (err) {
    console.error("[qr] render failed:", err);
    return fail("Could not render the QR code.", 500);
  }
}
