import { db, describeDbError } from "@/lib/db";
import { fail, getSettings, ok, rateLimit } from "@/lib/server-utils";
import { clientIp, str } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      const raw = await request.json();
      if (raw && typeof raw === "object" && !Array.isArray(raw)) body = raw as Record<string, unknown>;
    } catch {
      return fail("Invalid request body.", 400);
    }

    // ----- honeypot: bots that fill the hidden "website" field get a fake success -----
    const honeypot = str(body.website);
    if (honeypot !== "") {
      return ok({ leadId: "", sheetSynced: false });
    }

    // ----- rate limit: 5 submissions / 10 min per IP -----
    const ip = clientIp(request);
    if (!rateLimit(`leads:${ip}`, 5, 10 * 60 * 1000)) {
      return fail("Too many enquiries from your network. Please try again in a few minutes.", 429);
    }

    // ----- validation -----
    const name = str(body.name);
    if (name.length < 2 || name.length > 80) {
      return fail("Please enter your name (2–80 characters).", 400);
    }
    const mobile = str(body.mobile).replace(/[\s-]/g, "");
    if (!/^\+?\d{10,15}$/.test(mobile)) {
      return fail("Please enter a valid mobile number (10–15 digits, optionally starting with +).", 400);
    }
    const city = str(body.city);
    if (city.length < 2 || city.length > 80) {
      return fail("Please enter your city (2–80 characters).", 400);
    }
    const message = str(body.message);
    if (message.length > 1000) {
      return fail("Message is too long (maximum 1000 characters).", 400);
    }
    const preferredContact = str(body.preferredContact);
    if (preferredContact.length > 40) {
      return fail("Preferred contact method is too long.", 400);
    }

    // ----- persist -----
    const lead = await db.lead.create({
      data: {
        name,
        mobile,
        city,
        product: str(body.product).slice(0, 200),
        productUrl: str(body.productUrl).slice(0, 500),
        category: str(body.category).slice(0, 200),
        message: message.slice(0, 1000),
        preferredContact: preferredContact.slice(0, 40),
        sourcePage: str(body.sourcePage).slice(0, 200),
        utmSource: str(body.utmSource).slice(0, 200),
        utmMedium: str(body.utmMedium).slice(0, 200),
        utmCampaign: str(body.utmCampaign).slice(0, 200),
        referrer: str(body.referrer).slice(0, 500),
        status: "NEW",
      },
    });

    // ----- optional Google Sheets webhook forward (server-side, silent on failure) -----
    let sheetSynced = false;
    try {
      const settings = await getSettings();
      const webhook = (settings.googleSheetsWebhookUrl || "").trim();
      if (webhook) {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            name,
            mobile,
            city,
            product: lead.product,
            productUrl: lead.productUrl,
            category: lead.category,
            message: lead.message,
            preferredContact: lead.preferredContact,
            sourcePage: lead.sourcePage,
            utmSource: lead.utmSource,
            utmMedium: lead.utmMedium,
            utmCampaign: lead.utmCampaign,
            referrer: lead.referrer,
            status: "NEW",
            submittedAt: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) sheetSynced = true;
      }
    } catch {
      sheetSynced = false;
    }

    if (sheetSynced) {
      await db.lead.update({ where: { id: lead.id }, data: { sheetSynced: true } }).catch(() => {});
    }

    return ok({ leadId: lead.id, sheetSynced });
  } catch (e) {
    console.error("[api/public/leads]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
