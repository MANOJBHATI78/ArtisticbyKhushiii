import { db, describeDbError } from "@/lib/db";
import { fail, ok, sanitizeHtml } from "@/lib/server-utils";
import { bool, has, int, readJsonBody, str } from "@/lib/serializers";
import { requireAdmin } from "../../_guard";

export const dynamic = "force-dynamic";

const SECTION_KEYS = ["hero", "brand_intro", "why_choose", "custom_orders", "memory_preservation", "final_cta"];

function toSection(s: {
  sectionKey: string;
  heading: string;
  subheading: string;
  body: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  ctaText2: string;
  ctaUrl2: string;
  itemsJson: string;
  visible: boolean;
  displayOrder: number;
}) {
  return {
    sectionKey: s.sectionKey,
    heading: s.heading,
    subheading: s.subheading,
    body: s.body,
    imageUrl: s.imageUrl,
    ctaText: s.ctaText,
    ctaUrl: s.ctaUrl,
    ctaText2: s.ctaText2,
    ctaUrl2: s.ctaUrl2,
    itemsJson: s.itemsJson,
    visible: s.visible,
    displayOrder: s.displayOrder,
  };
}

export async function PUT(request: Request, { params }: { params: Promise<{ sectionKey: string }> }) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { sectionKey } = await params;
    if (!SECTION_KEYS.includes(sectionKey)) {
      return fail("Unknown homepage section key.", 400);
    }

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const fields: Record<string, string | number | boolean> = {};
    for (const key of ["heading", "subheading", "imageUrl", "ctaText", "ctaUrl", "ctaText2", "ctaUrl2"] as const) {
      if (has(body, key)) fields[key] = str(body[key]);
    }
    if (has(body, "body")) fields.body = sanitizeHtml(str(body.body));
    if (has(body, "visible")) fields.visible = bool(body.visible, true);
    if (has(body, "displayOrder")) fields.displayOrder = int(body.displayOrder, 0);
    if (has(body, "itemsJson")) {
      const raw = body.itemsJson;
      let parsed: unknown = null;
      if (typeof raw === "string") {
        const s = raw.trim();
        if (s === "") parsed = [];
        else {
          try {
            parsed = JSON.parse(s);
          } catch {
            parsed = "invalid";
          }
        }
      } else {
        parsed = raw;
      }
      if (parsed === "invalid" || !Array.isArray(parsed)) {
        return fail("itemsJson must be a JSON array (e.g. of {title, text} items).", 400);
      }
      fields.itemsJson = JSON.stringify(parsed);
    }

    if (Object.keys(fields).length === 0) {
      return fail("No valid section fields were provided.", 400);
    }

    const section = await db.homepageSection.upsert({
      where: { sectionKey },
      update: fields,
      create: { sectionKey, ...fields },
    });

    return ok(toSection(section));
  } catch (e) {
    console.error("[api/admin/homepage/[sectionKey]]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}
