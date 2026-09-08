"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard } from "./useAdminData";
import { timeAgo } from "./admin-utils";
import { LeadStatusBadge, ImageThumb, PublishedBadge, BlogStatusBadge, EmptyState } from "./shared";
import { ArrowRight, FolderTree, HelpCircle, Image as ImageIcon, Inbox, Newspaper, Package, Pencil, Phone, TrendingUp } from "lucide-react";
import type { AdminModuleKey } from "./admin-utils";

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
