"use client";

import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown,
  DatabaseBackup,
  ExternalLink,
  FileText,
  FolderTree,
  HelpCircle,
  Image,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Megaphone,
  Menu,
  MoreHorizontal,
  Newspaper,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import type { AdminModuleKey, AdminUser } from "./admin-utils";
import { initialsOf } from "./admin-utils";
import { useAdminDashboard } from "./useAdminData";

// ============================================================
// Console shell — collapsible sidebar (desktop), tab bar (mobile),
// top bar with global search, refresh and quick-add.
// ============================================================

const NAV: { key: AdminModuleKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Package },
  { key: "categories", label: "Categories", icon: FolderTree },
  { key: "blogs", label: "Blog Posts", icon: Newspaper },
  { key: "pages", label: "Pages", icon: FileText },
  { key: "faqs", label: "FAQs", icon: HelpCircle },
  { key: "leads", label: "Leads", icon: Inbox },
  { key: "media", label: "Media Library", icon: Image },
  { key: "homepage", label: "Homepage Sections", icon: LayoutTemplate },
  { key: "landing", label: "Landing Pages", icon: Megaphone },
  { key: "backup", label: "Backup & Sync", icon: DatabaseBackup },
  { key: "settings", label: "Site Settings", icon: SettingsIcon },
];

const TITLES: Record<AdminModuleKey, string> = {
  dashboard: "Dashboard",
  products: "Products",
  categories: "Categories",
  blogs: "Blog Posts",
  pages: "Pages",
  faqs: "FAQs",
  leads: "Leads",
  media: "Media Library",
  homepage: "Homepage Sections",
  landing: "Landing Pages",
  backup: "Backup & Sync",
  settings: "Site Settings",
};

const MOBILE_TABS: { key: AdminModuleKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Package },
  { key: "leads", label: "Leads", icon: Inbox },
  { key: "media", label: "Media", icon: Image },
];

export function AdminLayout({
  user,
  active,
  onNavigate,
  onQuickAdd,
  onSearch,
  onLogout,
  children,
}: {
  user: AdminUser;
  active: AdminModuleKey;
  onNavigate: (module: AdminModuleKey) => void;
  onQuickAdd: (module: AdminModuleKey) => void;
  onSearch: (module: AdminModuleKey, q: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchMenu, setSearchMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: stats } = useAdminDashboard();
  const newLeads = stats?.newLeads ?? 0;

  function navigate(module: AdminModuleKey) {
    onNavigate(module);
    setMobileNavOpen(false);
    setSearchMenu(false);
  }

  function refresh() {
    setRefreshing(true);
    void qc.invalidateQueries({ queryKey: ["admin"] }).finally(() => {
      setRefreshing(false);
      toast({ title: "Refreshed", description: "Studio Console data is up to date." });
    });
  }

  const searchOptions: { module: AdminModuleKey; label: string }[] = [
    { module: "products", label: "Products" },
    { module: "blogs", label: "Blog posts" },
    { module: "leads", label: "Leads" },
  ];

  const navContent = (opts: { compact?: boolean } = {}) => (
    <nav aria-label="Admin navigation" className="flex flex-1 flex-col gap-0.5 overflow-y-auto custom-scroll p-2">
      {NAV.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        const badge = item.key === "leads" && newLeads > 0 ? newLeads : null;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.key)}
            aria-current={isActive ? "page" : undefined}
            title={collapsed && !opts.compact ? item.label : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            } ${collapsed && !opts.compact ? "justify-center px-0" : ""}`}
          >
            <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-primary" : ""}`} style={{ width: 18, height: 18 }} />
            {!(collapsed && !opts.compact) ? (
              <>
                <span className="truncate">{item.label}</span>
                {badge ? (
                  <Badge className="ml-auto h-5 px-1.5 text-[11px] bg-gold-soft text-espresso border border-gold/40 font-semibold">
                    {badge} NEW
                  </Badge>
                ) : null}
              </>
            ) : badge ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  const userBlock = (compact = false) => (
    <div className="border-t p-2">
      <div className={`flex items-center gap-2.5 rounded-lg p-2 ${compact ? "" : "bg-muted/50"}`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        ) : null}
      </div>
      <div className={`flex gap-1 ${collapsed ? "flex-col" : ""}`}>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-destructive hover:text-destructive justify-center"
          onClick={onLogout}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? <span className="ml-1.5">Logout</span> : null}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] md:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className={`flex h-14 items-center gap-2.5 border-b px-3 ${collapsed ? "justify-center px-0" : ""}`}>
          { }
          <img src="/images/logo.png" alt="Artistic by Khushi" className="h-8 w-8 rounded-lg" />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold leading-tight text-primary">Studio Console</p>
              <p className="truncate text-[10px] text-muted-foreground">Artistic by Khushi</p>
            </div>
          ) : null}
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4 -rotate-90" /> : <ChevronDown className="h-4 w-4 rotate-90" />}
          </Button>
        </div>
        {navContent()}
        <div className="border-t p-2">
          <a
            href="#/"
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title="Open the public website in a new tab"
          >
            <ExternalLink className="h-4 w-4" />
            {!collapsed ? "View Website" : null}
          </a>
        </div>
        {userBlock()}
      </aside>

      {/* ---------- Main column ---------- */}
      <div className={`flex min-h-screen flex-col ${collapsed ? "md:pl-16" : "md:pl-64"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b px-3 py-3.5 text-left">
                <div className="flex items-center gap-2.5">
                  { }
                  <img src="/images/logo.png" alt="" className="h-8 w-8 rounded-lg" />
                  <SheetTitle className="font-display text-sm font-semibold text-primary">Studio Console</SheetTitle>
                </div>
              </SheetHeader>
              {navContent({ compact: true })}
              <div className="border-t p-2">
                <a
                  href="#/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" /> View Website
                </a>
              </div>
              {userBlock(true)}
            </SheetContent>
          </Sheet>

          <h1 className="font-display text-base font-semibold text-foreground md:text-lg">{TITLES[active]}</h1>

          <span className="flex-1" />

          {/* Global search */}
          <div className="relative hidden w-56 sm:block lg:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onFocus={() => searchQ.trim() && setSearchMenu(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchMenu(true);
                if (e.key === "Escape") setSearchMenu(false);
              }}
              placeholder="Search products, blogs, leads…"
              className="h-9 pl-8 pr-8"
              aria-label="Global search"
            />
            {searchQ ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQ("");
                  setSearchMenu(false);
                }}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            {searchMenu && searchQ.trim() ? (
              <div className="absolute right-0 top-11 z-50 w-64 rounded-lg border bg-popover p-1.5 shadow-lg">
                <p className="px-2 py-1 text-xs text-muted-foreground">Search “{searchQ.trim()}” in…</p>
                {searchOptions.map((opt) => (
                  <button
                    key={opt.module}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                    onClick={() => {
                      onSearch(opt.module, searchQ.trim());
                      setSearchMenu(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Quick add */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 gap-1">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Create new</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onQuickAdd("products")}>
                <Package className="mr-2 h-4 w-4" /> Product
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAdd("blogs")}>
                <Newspaper className="mr-2 h-4 w-4" /> Blog post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAdd("categories")}>
                <FolderTree className="mr-2 h-4 w-4" /> Category
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAdd("pages")}>
                <FileText className="mr-2 h-4 w-4" /> Page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onQuickAdd("faqs")}>
                <HelpCircle className="mr-2 h-4 w-4" /> FAQ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={refresh}
            aria-label="Refresh data"
            title="Refresh all console data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* ---------- Mobile bottom tab bar ---------- */}
      <nav
        aria-label="Admin mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-card md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              style={{ minHeight: 56 }}
            >
              <Icon className="h-5 w-5" style={{ width: 20, height: 20 }} />
              {tab.label}
              {tab.key === "leads" && newLeads > 0 ? (
                <span className="absolute right-1/4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-espresso">
                  {newLeads > 9 ? "9+" : newLeads}
                </span>
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
            !MOBILE_TABS.some((t) => t.key === active) ? "text-primary" : "text-muted-foreground"
          }`}
          style={{ minHeight: 56 }}
          aria-label="More sections"
        >
          <MoreHorizontal className="h-5 w-5" style={{ width: 20, height: 20 }} />
          More
        </button>
      </nav>
    </div>
  );
}

export { NAV };
