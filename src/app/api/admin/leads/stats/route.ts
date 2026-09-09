import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { requireAdmin } from "../../_guard";
import { LEAD_STATUSES } from "@/lib/types";
import type { LeadDailyPoint, LeadStats, LeadStatusCount } from "@/lib/types";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC "YYYY-MM-DD" key for a timestamp. */
function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const now = new Date();
    // UTC midnight of today, then the 14-day window (13 days back + today).
    const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const windowStart = todayStart - 13 * DAY_MS;
    // Rolling week windows that exactly match the two halves of the chart:
    // thisWeek = last 7 days (incl. today), lastWeek = the 7 days before that.
    const thisWeekStart = new Date(todayStart - 6 * DAY_MS);
    const lastWeekStart = new Date(todayStart - 13 * DAY_MS);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [recentLeads, statusGroups, productGroups, thisWeek, lastWeek, thisMonth] = await Promise.all([
      db.lead.findMany({
        where: { createdAt: { gte: new Date(windowStart) } },
        select: { createdAt: true, status: true },
      }),
      db.lead.groupBy({ by: ["status"], _count: { _all: true } }),
      db.lead.groupBy({
        by: ["product"],
        where: { product: { not: "" } },
        _count: { _all: true },
        orderBy: { _count: { product: "desc" } },
        take: 5,
      }),
      db.lead.count({ where: { createdAt: { gte: thisWeekStart } } }),
      db.lead.count({ where: { createdAt: { gte: lastWeekStart, lt: thisWeekStart } } }),
      db.lead.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    // Zero-filled 14-day series (every day present, oldest first).
    const byDay = new Map<string, LeadDailyPoint>();
    for (let i = 0; i < 14; i++) {
      const key = dayKey(windowStart + i * DAY_MS);
      byDay.set(key, { date: key, count: 0, converted: 0 });
    }
    let totalLeads = 0;
    let convertedLeads = 0;
    for (const g of statusGroups) {
      totalLeads += g._count._all;
      if (g.status === "CONVERTED") convertedLeads += g._count._all;
    }
    for (const lead of recentLeads) {
      const key = dayKey(lead.createdAt.getTime());
      const day = byDay.get(key);
      if (day) {
        day.count += 1;
        if (lead.status === "CONVERTED") day.converted += 1;
      }
    }

    // All 6 statuses, zero counts included.
    const statusCounts = new Map(statusGroups.map((g) => [g.status, g._count._all]));
    const statusBreakdown: LeadStatusCount[] = LEAD_STATUSES.map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    }));

    const stats: LeadStats = {
      leadsPerDay: Array.from(byDay.values()),
      statusBreakdown,
      topProducts: productGroups.map((g) => ({ name: g.product, count: g._count._all })),
      totals: {
        thisWeek,
        lastWeek,
        thisMonth,
        conversionRate: totalLeads === 0 ? 0 : Math.round((convertedLeads / totalLeads) * 1000) / 10,
      },
    };

    return ok(stats);
  } catch (e) {
    console.error("[api/admin/leads/stats GET]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
