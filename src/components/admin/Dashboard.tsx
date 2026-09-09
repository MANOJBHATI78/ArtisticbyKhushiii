"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard, useLeadStats } from "./useAdminData";
import { timeAgo } from "./admin-utils";
import { LeadStatusBadge, ImageThumb, PublishedBadge, BlogStatusBadge, EmptyState } from "./shared";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  FolderTree,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  Newspaper,
  Package,
  Pencil,
  Phone,
  PieChart as PieChartIcon,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { AdminModuleKey } from "./admin-utils";
import type { LeadStats, LeadStatsTotals, LeadStatusCount } from "@/lib/types";

export function Dashboard({
  onNavigate,
  onQuickAdd,
  onEditProduct,
  onEditBlog,
}: {
  onNavigate: (module: AdminModuleKey) => void;
  onQuickAdd: (module: AdminModuleKey) => void;
  onEditProduct: (id: string) => void;
  onEditBlog: (id: string) => void;
}) {
  const { data: stats, isLoading } = useAdminDashboard();

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const cards = [
    {
      label: "Total Products",
      value: stats.totalProducts,
      sub: `${stats.publishedProducts} published · ${stats.draftProducts} draft`,
      icon: Package,
      tint: "bg-primary/10 text-primary",
      module: "products" as AdminModuleKey,
    },
    {
      label: "Categories",
      value: stats.totalCategories,
      sub: "catalogue sections",
      icon: FolderTree,
      tint: "bg-terracotta/15 text-terracotta-deep",
      module: "categories" as AdminModuleKey,
    },
    {
      label: "Blog Posts",
      value: stats.publishedBlogs + stats.draftBlogs,
      sub: `${stats.publishedBlogs} published · ${stats.draftBlogs} draft`,
      icon: Newspaper,
      tint: "bg-gold-soft text-espresso",
      module: "blogs" as AdminModuleKey,
    },
    {
      label: "Leads",
      value: stats.totalLeads,
      sub: `${stats.newLeads} new · ${stats.convertedLeads} converted`,
      icon: Inbox,
      tint: "bg-green-100 text-green-800",
      module: "leads" as AdminModuleKey,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.module)}
              className="group text-left"
              aria-label={`Open ${card.label}`}
            >
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.tint}`}>
                      <Icon className="h-5 w-5" style={{ width: 20, height: 20 }} />
                    </div>
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/40" aria-hidden />
                  </div>
                  <p className="mt-3 font-display text-2xl font-semibold leading-none md:text-3xl">{card.value}</p>
                  <p className="mt-1 text-xs font-medium text-foreground/80">{card.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{card.sub}</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Inquiry analytics (charts) */}
      <LeadAnalyticsSection onNavigate={onNavigate} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent inquiries */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-display">Recent Inquiries</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onNavigate("leads")}>
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentLeads.length === 0 ? (
              <EmptyState icon={<Inbox className="h-8 w-8 text-muted-foreground/50" />} title="No inquiries yet" hint="New enquiries from the website will appear here." />
            ) : (
              <ul className="max-h-96 divide-y overflow-y-auto custom-scroll" role="list">
                {stats.recentLeads.map((lead) => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate("leads")}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-secondary/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{lead.name}</p>
                          <LeadStatusBadge status={lead.status} />
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {lead.mobile ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.mobile}
                            </span>
                          ) : null}
                          {lead.product ? <span className="truncate">· {lead.product}</span> : null}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(lead.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0">
            <Button variant="outline" className="justify-start gap-2" onClick={() => onQuickAdd("products")}>
              <Package className="h-4 w-4 text-primary" /> Add Product
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => onQuickAdd("blogs")}>
              <Newspaper className="h-4 w-4 text-primary" /> Add Blog Post
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => onQuickAdd("categories")}>
              <FolderTree className="h-4 w-4 text-primary" /> Add Category
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => onQuickAdd("faqs")}>
              <HelpCircle className="h-4 w-4 text-primary" /> Add FAQ
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => onNavigate("media")}>
              <ImageIcon className="h-4 w-4 text-primary" /> Upload Images
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recently updated */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-display">Recently Updated Products</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onNavigate("products")}>
              All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No products yet.</p>
            ) : (
              <ul className="divide-y" role="list">
                {stats.recentProducts.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <ImageThumb src={null} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">Updated {timeAgo(p.updatedAt)}</p>
                    </div>
                    <PublishedBadge published={p.published} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditProduct(p.id)} aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-display">Recently Updated Blogs</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onNavigate("blogs")}>
              All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentBlogs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No blog posts yet.</p>
            ) : (
              <ul className="divide-y" role="list">
                {stats.recentBlogs.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.title}</p>
                      <p className="text-[11px] text-muted-foreground">Updated {timeAgo(b.updatedAt)}</p>
                    </div>
                    <BlogStatusBadge status={b.status} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditBlog(b.id)} aria-label={`Edit ${b.title}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Inquiry Analytics — lead charts (recharts, brand palette)
// ============================================================

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-08" → "8 Sep" (timezone-safe, no date parsing). */
function fmtDay(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]}`;
}

function fmtRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
}

/** Brand chart inks — chocolate / gold / terracotta (no blues). */
const INK = {
  brown: "#7A5230", // primary series — all inquiries
  gold: "#C9973B", // accent series — converted
  grid: "#E8DCC8", // warm grid / axis lines
  tick: "#9C8F80", // axis text — warm gray
};

/** Donut + legend palette per lead status (matches the status badge hues). */
const STATUS_COLORS: Record<string, string> = {
  NEW: "#C9973B", // gold
  CONTACTED: "#C07049", // terracotta
  FOLLOW_UP: "#A9835B", // tan
  CONVERTED: "#7A8B5D", // muted olive (green badge family)
  NOT_INTERESTED: "#9C8F80", // warm gray
  CLOSED: "#D6C7B2", // cream taupe
};

const TOP_BAR_COLORS = ["#7A5230", "#A9835B", "#C9973B", "#C07049", "#D6C7B2"];

interface DonutDatum extends LeadStatusCount {
  total: number;
}

function DayTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length || !label) return null;
  const total = payload.find((p) => p.dataKey === "count")?.value ?? 0;
  const converted = payload.find((p) => p.dataKey === "converted")?.value ?? 0;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{fmtDay(label)}</p>
      <p className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INK.brown }} aria-hidden />
        <span className="text-muted-foreground">Inquiries</span>
        <span className="ml-auto pl-4 font-semibold">{total}</span>
      </p>
      <p className="mt-0.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INK.gold }} aria-hidden />
        <span className="text-muted-foreground">Converted</span>
        <span className="ml-auto pl-4 font-semibold">{converted}</span>
      </p>
    </div>
  );
}

function StatusTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as DonutDatum | undefined;
  if (!datum) return null;
  const pct = datum.total > 0 ? Math.round((datum.count / datum.total) * 100) : 0;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-0.5 font-medium">{datum.status.replace("_", " ")}</p>
      <p className="text-muted-foreground">
        {datum.count} {datum.count === 1 ? "inquiry" : "inquiries"} · {pct}%
      </p>
    </div>
  );
}

function TotalsPill({ label, value, delta }: { label: string; value: number | string; delta?: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold leading-none">{value}</span>
      {delta !== undefined && delta !== 0 ? (
        <span
          className={`flex items-center gap-0.5 text-[11px] font-semibold leading-none ${
            delta > 0 ? "text-green-700" : "text-terracotta-deep"
          }`}
        >
          {delta > 0 ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />}
          {Math.abs(delta)}
        </span>
      ) : null}
    </div>
  );
}

function StatusDonut({ breakdown }: { breakdown: LeadStatusCount[] }) {
  const total = breakdown.reduce((sum, s) => sum + s.count, 0);
  const data: DonutDatum[] = breakdown.map((s) => ({ ...s, total }));
  if (total === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-8 w-8 text-muted-foreground/50" />}
        title="No inquiries yet"
        hint="The status mix of your enquiries will appear here."
      />
    );
  }
  return (
    <>
      <div className="relative h-52 w-full" role="img" aria-label="Share of inquiries by status">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, bottom: 4, left: 8, right: 8 }}>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive
            >
              {data.map((slice) => (
                <Cell key={slice.status} fill={STATUS_COLORS[slice.status] ?? INK.tick} />
              ))}
            </Pie>
            <Tooltip content={<StatusTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-2xl font-semibold leading-none">{total}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">inquiries</p>
        </div>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5" aria-label="Inquiry counts by status">
        {breakdown.map((s) => (
          <li key={s.status} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[s.status] ?? INK.tick }}
              aria-hidden
            />
            <span className="truncate text-muted-foreground">{s.status.replace("_", " ")}</span>
            <span className="ml-auto font-semibold">{s.count}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function TopProductsList({ products }: { products: LeadStats["topProducts"] }) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-8 w-8 text-muted-foreground/50" />}
        title="No product inquiries yet"
        hint="Enquiries that mention a product will rank here."
      />
    );
  }
  const max = Math.max(...products.map((p) => p.count));
  return (
    <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2" aria-label="Most inquired products">
      {products.map((p, i) => {
        const pct = max > 0 ? Math.max(10, Math.round((p.count / max) * 100)) : 0;
        return (
          <li key={p.name}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{p.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {p.count} {p.count === 1 ? "inquiry" : "inquiries"}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-secondary"
              role="img"
              aria-label={`${p.name}: ${p.count} inquiries`}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: TOP_BAR_COLORS[i % TOP_BAR_COLORS.length] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LeadAnalyticsSection({ onNavigate }: { onNavigate: (module: AdminModuleKey) => void }) {
  const qc = useQueryClient();
  const { data: stats, isLoading } = useLeadStats();

  // Invalidate on (re)mount so the analytics always refresh with the module.
  useEffect(() => {
    if (qc.getQueryData(["admin", "lead-stats"]) !== undefined) {
      void qc.invalidateQueries({ queryKey: ["admin", "lead-stats"] });
    }
  }, [qc]);

  const totals: LeadStatsTotals | undefined = stats?.totals;
  const daily = stats?.leadsPerDay ?? [];
  const maxDaily = daily.length > 0 ? Math.max(...daily.map((d) => d.count)) : 0;
  const yMax = Math.max(4, maxDaily);
  const weekDelta = totals ? totals.thisWeek - totals.lastWeek : undefined;

  return (
    <section aria-labelledby="inquiry-analytics-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="inquiry-analytics-heading" className="flex items-center gap-2 font-display text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden /> Inquiry Analytics
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">How enquiries arrive and convert — last 14 days.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totals ? <TotalsPill label="This week" value={totals.thisWeek} delta={weekDelta} /> : null}
          {totals ? <TotalsPill label="Last week" value={totals.lastWeek} /> : null}
          {totals ? <TotalsPill label="This month" value={totals.thisMonth} /> : null}
          {totals ? <TotalsPill label="Conversion" value={`${fmtRate(totals.conversionRate)}%`} /> : null}
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onNavigate("leads")}>
            View leads <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leads per day — area chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base font-display">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Inquiries per Day
              </span>
              <span className="flex items-center gap-3 text-[11px] font-normal text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INK.brown }} aria-hidden /> All
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INK.gold }} aria-hidden /> Converted
                </span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : (
              <>
                <div className="h-56 w-full" role="img" aria-label="Inquiries per day over the last 14 days">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="abkLeadTotalFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={INK.brown} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={INK.brown} stopOpacity={0.04} />
                        </linearGradient>
                        <linearGradient id="abkLeadConvFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={INK.gold} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={INK.gold} stopOpacity={0.06} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={fmtDay}
                        tick={{ fontSize: 11, fill: INK.tick }}
                        tickLine={false}
                        axisLine={{ stroke: INK.grid }}
                        minTickGap={16}
                      />
                      <YAxis
                        width={28}
                        allowDecimals={false}
                        domain={[0, yMax]}
                        tick={{ fontSize: 11, fill: INK.tick }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<DayTooltip />} cursor={{ stroke: INK.tick, strokeDasharray: "3 3" }} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Inquiries"
                        stroke={INK.brown}
                        strokeWidth={2}
                        fill="url(#abkLeadTotalFill)"
                        activeDot={{ r: 4 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="converted"
                        name="Converted"
                        stroke={INK.gold}
                        strokeWidth={2}
                        fill="url(#abkLeadConvFill)"
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {maxDaily === 0 ? (
                  <p className="pt-2 text-center text-xs text-muted-foreground">
                    No inquiries in the last 14 days — the chart will fill in as enquiries arrive.
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown — donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <PieChartIcon className="h-4 w-4 text-primary" aria-hidden /> Inquiries by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? <Skeleton className="h-56 w-full rounded-lg" /> : <StatusDonut breakdown={stats?.statusBreakdown ?? []} />}
          </CardContent>
        </Card>
      </div>

      {/* Top inquired products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <Trophy className="h-4 w-4 text-primary" aria-hidden /> Most Inquired Products
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">all time · top 5</span>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <TopProductsList products={stats?.topProducts ?? []} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
