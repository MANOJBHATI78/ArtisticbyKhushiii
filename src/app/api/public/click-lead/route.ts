import { db, describeDbError } from "@/lib/db";
import { fail, getSettings, ok, rateLimit } from "@/lib/server-utils";
import { clientIp, str } from "@/lib/serializers";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/click-lead — quick capture used by the WhatsApp / call
 * gate dialog. The visitor fills just name + mobile, we store the lead and
 * the front-end then opens WhatsApp / the dialer. Same mobile + same kind
 * within 30 minutes is de-duplicated so repeat taps never spam the inbox.
 *
 * Body: { name, mobile, kind: "whatsapp" | "call", sourcePage?, product?,
 *         productUrl?, category?, referrer?, website? (honeypot) }
 */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      const raw = await request.json();
      if (raw && typeof raw === "object" && !Array.isArray(raw)) body = raw as Record<string, unknown>;
    } catch {
      return fail("Invalid request body.", 400);
    }

    // Honeypot — bots get a fake success.
    if (str(body.website) !== "") return ok({ leadId: "", duplicate: false });

    const ip = clientIp(request);
    if (!rateLimit(`click-leads:${ip}`, 15, 10 * 60 * 1000)) {
      return fail("Too many requests. Please try again in a few minutes.", 429);
    }

    const name = str(body.name).trim();
    if (name.length < 2 || name.length > 80) return fail("Please enter your name.", 400);

    const mobile = str(body.mobile).replace(/[\s-]/g, "");
    if (!/^\+?\d{10,15}$/.test(mobile)) return fail("Please enter a valid mobile number.", 400);

    const kind = str(body.kind) === "call" ? "call" : "whatsapp";
    const product = str(body.product).slice(0, 200);
    const sourcePage = str(body.sourcePage).slice(0, 200);

    // De-dupe: same person tapping WhatsApp/call again within 30 min doesn't spam.
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const duplicate = await db.lead.findFirst({
      where: { mobile, utmSource: `${kind}_click`, createdAt: { gte: since } },
      select: { id: true },
    });
    if (duplicate) return ok({ leadId: duplicate.id, duplicate: true });

    const lead = await db.lead.create({
      data: {
        name,
        mobile,
        city: "-",
        product,
        productUrl: str(body.productUrl).slice(0, 500),
        category: str(body.category).slice(0, 200),
        message:
          product
            ? `Customer tapped ${kind === "call" ? "the call button" : "WhatsApp"} for "${product}".`
            : `Customer tapped ${kind === "call" ? "the call button" : "WhatsApp"} to get in touch.`,
        preferredContact: kind === "call" ? "phone" : "whatsapp",
        sourcePage,
        utmSource: `${kind}_click`,
        referrer: str(body.referrer).slice(0, 500),
        status: "NEW",
      },
    });

    // Optional Google Sheets forward — same as the main lead form (silent).
    try {
      const settings = await getSettings();
      const webhook = (settings.googleSheetsWebhookUrl || "").trim();
      if (webhook) {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            name,
            mobile,
            city: "",
            product: lead.product,
            productUrl: lead.productUrl,
            category: lead.category,
            message: lead.message,
            preferredContact: lead.preferredContact,
            sourcePage: lead.sourcePage,
            utmSource: lead.utmSource,
            submittedAt: new Date().toISOString(),
            status: "NEW",
          }),
          signal: AbortSignal.timeout(5000),
        });
      }
    } catch {
      /* sheet sync is best-effort */
    }

    return ok({ leadId: lead.id, duplicate: false });
  } catch (e) {
    console.error("[api/public/click-lead]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)}`, 500);
  }
}
