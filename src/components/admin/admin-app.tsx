"use client";

import { useState } from "react";
import { Providers } from "@/components/providers";
import { Loader2 } from "lucide-react";
import { useAdminMe } from "./useAdminData";
import { useAdminAuth } from "./useAdminAuth";
import AdminLogin from "./AdminLogin";
import { AdminLayout } from "./AdminLayout";
import { DbModeBanner } from "./DbModeBanner";
import { Dashboard } from "./Dashboard";
import { ProductsManager } from "./ProductsManager";
import { CategoriesManager } from "./CategoriesManager";
import { BlogsManager } from "./BlogsManager";
import { PagesManager } from "./PagesManager";
import { FaqsManager } from "./FaqsManager";
import { TestimonialsManager } from "./TestimonialsManager";
import { LeadsManager } from "./LeadsManager";
import { MediaLibrary } from "./MediaLibrary";
import { HomepageManager } from "./HomepageManager";
import { LandingManager } from "./LandingManager";
import { BackupManager } from "./BackupManager";
import { SettingsManager } from "./SettingsManager";
import { UsersManager } from "./UsersManager";
import { SchemaManager } from "./SchemaManager";
import type { AdminModuleKey } from "./admin-utils";

/**
 * Admin panel application — rendered for #/admin* routes.
 * Auth gate + shell + module routing (state-based).
 */
export default function AdminApp() {
  return (
    <Providers>
      <AdminGate />
    </Providers>
  );
}

interface JumpSignal {
  module: AdminModuleKey;
  q: string;
  n: number;
}
interface CreateSignal {
  module: AdminModuleKey;
  n: number;
}
interface EditSignal {
  module: AdminModuleKey;
  id: string;
  n: number;
}

function AdminGate() {
  const me = useAdminMe();
  const { logout } = useAdminAuth();

  const [module, setModule] = useState<AdminModuleKey>(() => {
    if (typeof window === "undefined") return "dashboard";
    const saved = window.sessionStorage.getItem("abk_admin_module");
    const keys: AdminModuleKey[] = [
      "dashboard", "products", "categories", "blogs", "pages", "faqs", "testimonials", "leads", "media", "homepage", "landing", "backup", "settings", "users", "schemas",
    ];
    return keys.includes(saved as AdminModuleKey) ? (saved as AdminModuleKey) : "dashboard";
  });
  const [jump, setJump] = useState<JumpSignal | undefined>();
  const [createSig, setCreateSig] = useState<CreateSignal | undefined>();
  const [editSig, setEditSig] = useState<EditSignal | undefined>();
  const [sigCount, setSigCount] = useState(0);

  function nextN() {
    setSigCount((c) => c + 1);
    return sigCount + 1;
  }

  function navigate(m: AdminModuleKey) {
    if (m !== module) {
      setJump(undefined);
      setCreateSig(undefined);
      setEditSig(undefined);
    }
    setModule(m);
    try {
      window.sessionStorage.setItem("abk_admin_module", m);
    } catch {
      // sessionStorage unavailable — module simply won't persist across reloads
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function quickAdd(m: AdminModuleKey) {
    setCreateSig({ module: m, n: nextN() });
    setModule(m);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function search(m: AdminModuleKey, q: string) {
    setJump({ module: m, q, n: nextN() });
    setModule(m);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function editEntity(m: AdminModuleKey, id: string) {
    setEditSig({ module: m, id, n: nextN() });
    setModule(m);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  // ---- splash while checking session ----
  if (me.isPending && !me.data) return <SplashScreen />;

  // ---- 401 / logged out ----
  if (me.isError || !me.data) return <AdminLogin />;

  const user = me.data;

  // Users & Roles is OWNER-only — if a non-owner somehow lands on it
  // (stale sessionStorage from a previous login), show the dashboard.
  const activeModule: AdminModuleKey = module === "users" && user.role !== "OWNER" ? "dashboard" : module;

  return (
    <AdminLayout user={user} active={activeModule} onNavigate={navigate} onQuickAdd={quickAdd} onSearch={search} onLogout={() => void logout()}>
      <DbModeBanner />
      {activeModule === "dashboard" ? (
        <Dashboard onNavigate={navigate} onQuickAdd={quickAdd} onEditProduct={(id) => editEntity("products", id)} onEditBlog={(id) => editEntity("blogs", id)} />
      ) : null}

      {activeModule === "products" ? (
        <ProductsManager
          key={`products|c${createSig?.module === "products" ? createSig.n : 0}|j${jump?.module === "products" ? jump.n : 0}|e${editSig?.module === "products" ? editSig.n : 0}`}
          jump={jump?.module === "products" ? jump : undefined}
          createSignal={createSig?.module === "products" ? createSig.n : 0}
          editId={editSig?.module === "products" ? editSig.id : undefined}
        />
      ) : null}

      {activeModule === "categories" ? (
        <CategoriesManager
          key={`categories|c${createSig?.module === "categories" ? createSig.n : 0}`}
          createSignal={createSig?.module === "categories" ? createSig.n : 0}
        />
      ) : null}

      {activeModule === "blogs" ? (
        <BlogsManager
          key={`blogs|c${createSig?.module === "blogs" ? createSig.n : 0}|j${jump?.module === "blogs" ? jump.n : 0}|e${editSig?.module === "blogs" ? editSig.n : 0}`}
          jump={jump?.module === "blogs" ? jump : undefined}
          createSignal={createSig?.module === "blogs" ? createSig.n : 0}
          editId={editSig?.module === "blogs" ? editSig.id : undefined}
        />
      ) : null}

      {activeModule === "pages" ? (
        <PagesManager key={`pages|c${createSig?.module === "pages" ? createSig.n : 0}`} createSignal={createSig?.module === "pages" ? createSig.n : 0} />
      ) : null}

      {activeModule === "faqs" ? (
        <FaqsManager key={`faqs|c${createSig?.module === "faqs" ? createSig.n : 0}`} createSignal={createSig?.module === "faqs" ? createSig.n : 0} />
      ) : null}

      {activeModule === "testimonials" ? (
        <TestimonialsManager key={`testimonials|c${createSig?.module === "testimonials" ? createSig.n : 0}`} createSignal={createSig?.module === "testimonials" ? createSig.n : 0} />
      ) : null}

      {activeModule === "leads" ? (
        <LeadsManager key={`leads|j${jump?.module === "leads" ? jump.n : 0}`} jump={jump?.module === "leads" ? jump : undefined} />
      ) : null}

      {activeModule === "media" ? <MediaLibrary /> : null}
      {activeModule === "homepage" ? <HomepageManager /> : null}
      {activeModule === "landing" ? (
        <LandingManager key={`landing|c${createSig?.module === "landing" ? createSig.n : 0}`} createSignal={createSig?.module === "landing" ? createSig.n : 0} />
      ) : null}
      {activeModule === "backup" ? <BackupManager /> : null}
      {activeModule === "settings" ? <SettingsManager /> : null}
      {activeModule === "users" ? <UsersManager /> : null}
      {activeModule === "schemas" ? <SchemaManager /> : null}
    </AdminLayout>
  );
}

function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      { }
      <img src="/images/logo.png" alt="Artistic by Khushiii" width={72} height={72} className="rounded-2xl border border-gold/40 animate-fade-up" />
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-display text-lg text-primary">Studio Console</span>
      </div>
    </div>
  );
}
