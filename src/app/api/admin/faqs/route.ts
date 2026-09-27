import { db, describeDbError } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { readJsonBody, toFaq } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { parseFaqFields } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const url = new URL(request.url);
    const entityType = (url.searchParams.get("entityType") || "").trim().toUpperCase();
    const entityId = (url.searchParams.get("entityId") || "").trim();

    const where: Prisma.FaqWhereInput = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const faqs = await db.faq.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return ok(faqs.map(toFaq));
  } catch (e) {
    console.error("[api/admin/faqs GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const question = typeof body.question === "string" ? body.question.trim() : "";
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!question) return fail("FAQ question is required.", 400);
    if (!answer) return fail("FAQ answer is required.", 400);

    const parsed = parseFaqFields(body);
    if (!parsed.ok) return fail(parsed.error, 400);
    const fields = parsed.fields;

    const faq = await db.faq.create({
      data: {
        ...(fields as Record<string, string | number | boolean | null>),
        question,
        answer,
        entityType: (fields.entityType as string) || "GENERAL",
      } as Prisma.FaqUncheckedCreateInput,
    });
    return ok({ faq: toFaq(faq) });
  } catch (e) {
    console.error("[api/admin/faqs POST]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
