import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/server-utils";
import { paginated, pagination, toLead } from "@/lib/serializers";
import { requireAdmin } from "../_guard";
import { LEAD_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const url = new URL(request.url);
    const { page, pageSize, skip, take } = pagination(url.searchParams, 20, 100);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim().toUpperCase();

    const where: Prisma.LeadWhereInput = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { product: { contains: q } },
      ];
    }
    if (status) {
      if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
        return fail("Invalid status filter.", 400);
      }
      where.status = status;
    }

    const [total, leads] = await Promise.all([
      db.lead.count({ where }),
      db.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    ]);

    return ok(paginated(leads.map(toLead), total, page, pageSize));
  } catch (e) {
    console.error("[api/admin/leads GET]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
