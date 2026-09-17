"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { AdminLandingPage, LandingFaqItem, PublicProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bot,
  ChevronLeft,
  Eye,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useAdminLandings, useAdminProductsLite } from "./useAdminData";
import { CharCount, ConfirmDialog, EmptyState, Field, GooglePreview, ImageThumb, PublishedBadge, SlugInput, Spinner } from "./shared";
import { RichTextEditor } from "./rich-text-editor";
import { MediaPickField } from "./media-picker";
import { errMsg, isValidSlug, useDebounced } from "./admin-utils";

// ============================================================
// Landing Pages module — build SEO/GEO/LLM-optimized marketing
// pages from the admin panel, no code needed.
// ============================================================

export function LandingManager({ createSignal }: { createSignal?: number }) {
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const { data: landings, isLoading } = useAdminLandings(debouncedQ);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState<AdminLandingPage | "new" | null>(createSignal ? "new" : null);
  const [toDelete, setToDelete] = useState<AdminLandingPage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const listKey = useMemo(() => ["admin", "landing", debouncedQ] as const, [debouncedQ]);

  function invalidateAll() {
    void qc.invalidateQueries({ queryKey: ["admin", "landing"] });
    void qc.invalidateQueries({ queryKey: ["landing"] });
  }

  function togglePublished(landing: AdminLandingPage) {
    const prev = qc.getQueryData<AdminLandingPage[]>(listKey);
    if (prev) qc.setQueryData(listKey, prev.map((l) => (l.id === landing.id ? { ...l, published: !landing.published } : l)));
    api
      .put(`/api/admin/landing/${landing.id}`, { published: !landing.published })
      .then(() => {
        toast({ title: !landing.published ? "Landing published" : "Landing unpublished", description: landing.title });
        invalidateAll();
      })
      .catch((e) => {
        if (prev) qc.setQueryData(listKey, prev);
        toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
      });
  }

  function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    api
      .delete(`/api/admin/landing/${toDelete.id}`)
      .then(() => {
        toast({ title: "Landing deleted", description: toDelete.title });
        setToDelete(null);
        invalidateAll();
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  const list = landings ?? [];

  // ---------------- editor mode ----------------
  if (editing !== null) {
    return (
      <LandingEditor
        key={editing === "new" ? "new" : editing.id}
        landing={editing === "new" ? null : editing}
        onCreated={(created) => setEditing(created)}
        onClose={() => setEditing(null)}
      />
    );
  }

  // ---------------- list mode ----------------
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Marketing pages for offers, festivals and cities — full SEO, GEO aur AI-SEO ke saath.
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1 h-4 w-4" /> New Landing
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search landings by title, slug or keyword…"
          className="pl-9"
          aria-label="Search landing pages"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8 text-muted-foreground/50" />}
          title={q ? "No matching landings" : "No landing pages yet"}
          hint={
            q
              ? "Try a different search."
              : "Ek naya landing page banao — jaise “Diwali Gifting Surat” ya “Resin Nameplates Mumbai”. Google, local search aur AI assistants sab ke liye optimized."
          }
          action={
            !q ? (
              <Button onClick={() => setEditing("new")}>
                <Plus className="mr-1 h-4 w-4" /> Create your first landing
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Landing</TableHead>
                  <TableHead className="w-44">URL</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20 text-center">Views</TableHead>
                  <TableHead className="w-20 text-center">Order</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <button type="button" className="max-w-xs text-left" onClick={() => setEditing(l)}>
                        <p className="truncate font-medium hover:text-primary">{l.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{l.focusKeyword || l.headline || "—"}</p>
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">#/lp/{l.slug}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Switch checked={l.published} onCheckedChange={() => togglePublished(l)} aria-label={`Toggle published for ${l.title}`} />
                        <span className="text-[11px] text-muted-foreground">{l.published ? "Published" : "Draft"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" aria-hidden="true" />
                        {l.views}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{l.displayOrder}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <a
                          href={`#/lp/${l.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary"
                          title="Preview"
                          aria-label={`Preview ${l.title}`}
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(l)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setToDelete(l)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {list.map((l) => (
              <Card key={l.id}>
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => setEditing(l)} className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium">{l.title}</p>
                      <p className="truncate text-xs text-muted-foreground">#/lp/{l.slug}</p>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <PublishedBadge published={l.published} />
                      {l.noindex ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                          noindex
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3.5" aria-hidden="true" />
                      {l.views} views
                    </span>
                    <span>order {l.displayOrder}</span>
                    <span className="flex-1" />
                    <Switch checked={l.published} onCheckedChange={() => togglePublished(l)} aria-label="Toggle published" />
                    <a
                      href={`#/lp/${l.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border"
                      aria-label="Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(l)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.title ?? ""}”?`}
        description="This permanently removes the landing page (any ads or links pointing to #/lp/… will stop working)."
        confirmLabel="Delete landing"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}

// ============================================================
// Landing editor — 7 tabs (Content / Products / FAQ / SEO / GEO / AI / Advanced)
// ============================================================

interface LandingFormState {
  title: string;
  slug: string;
  headline: string;
  subheadline: string;
  heroImageUrl: string;
  heroMobileImageUrl: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  productIds: string[];
  faqs: LandingFaqItem[];
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  noindex: boolean;
  geoRegion: string;
  geoPlacename: string;
  geoPosition: string;
  targetLocations: string;
  llmSummary: string;
  llmKeywords: string;
  customHtml: string;
  customCss: string;
  customJs: string;
  schemaJson: string;
  displayOrder: number;
  published: boolean;
}

function parseJsonIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && !!v);
  } catch {
    return [];
  }
}

function parseFaqs(raw: string): LandingFaqItem[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object" && !Array.isArray(f))
      .map((f) => ({ question: String(f.question ?? ""), answer: String(f.answer ?? "") }));
  } catch {
    return [];
  }
}

function fromLanding(l: AdminLandingPage): LandingFormState {
  return {
    title: l.title,
    slug: l.slug,
    headline: l.headline,
    subheadline: l.subheadline,
    heroImageUrl: l.heroImageUrl,
    heroMobileImageUrl: l.heroMobileImageUrl,
    bodyHtml: l.bodyHtml,
    ctaText: l.ctaText,
    ctaUrl: l.ctaUrl,
    productIds: parseJsonIds(l.productIds),
    faqs: parseFaqs(l.faqsJson),
    metaTitle: l.metaTitle,
    metaDescription: l.metaDescription,
    focusKeyword: l.focusKeyword,
    secondaryKeywords: l.secondaryKeywords,
    canonicalUrl: l.canonicalUrl,
    ogTitle: l.ogTitle,
    ogDescription: l.ogDescription,
    ogImageUrl: l.ogImageUrl,
    noindex: l.noindex,
    geoRegion: l.geoRegion,
    geoPlacename: l.geoPlacename,
    geoPosition: l.geoPosition,
    targetLocations: l.targetLocations,
    llmSummary: l.llmSummary,
    llmKeywords: l.llmKeywords,
    customHtml: l.customHtml,
    customCss: l.customCss,
    customJs: l.customJs,
    schemaJson: l.schemaJson,
    displayOrder: l.displayOrder,
    published: l.published,
  };
}

const EMPTY_FORM: LandingFormState = {
  title: "",
  slug: "",
  headline: "",
  subheadline: "",
  heroImageUrl: "",
  heroMobileImageUrl: "",
  bodyHtml: "",
  ctaText: "",
  ctaUrl: "",
  productIds: [],
  faqs: [],
  metaTitle: "",
  metaDescription: "",
  focusKeyword: "",
  secondaryKeywords: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  noindex: false,
  geoRegion: "",
  geoPlacename: "",
  geoPosition: "",
  targetLocations: "",
  llmSummary: "",
  llmKeywords: "",
  customHtml: "",
  customCss: "",
  customJs: "",
  schemaJson: "",
  displayOrder: 0,
  published: false,
};

function LandingEditor({
  landing,
  onCreated,
  onClose,
}: {
  landing: AdminLandingPage | null;
  onCreated: (created: AdminLandingPage) => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: products, isLoading: productsLoading } = useAdminProductsLite();
  const { data: landings } = useAdminLandings();

  const [form, setForm] = useState<LandingFormState>(() => (landing ? fromLanding(landing) : EMPTY_FORM));
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  function set<K extends keyof LandingFormState>(key: K, value: LandingFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const productById = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);
  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const s = productSearch.trim().toLowerCase();
    if (!s) return list;
    return list.filter((p) => p.name.toLowerCase().includes(s) || p.categoryName.toLowerCase().includes(s));
  }, [products, productSearch]);

  const slugError = submitted && form.slug ? (!isValidSlug(form.slug) ? "Lowercase letters, numbers and single hyphens only." : undefined) : undefined;
  const slugTaken = useMemo(() => {
    if (!form.slug) return false;
    return (landings ?? []).some((l) => l.slug === form.slug && l.id !== landing?.id);
  }, [landings, form.slug, landing?.id]);

  function toggleProduct(id: string) {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id],
    }));
  }

  function moveProduct(id: string, dir: -1 | 1) {
    setForm((f) => {
      const idx = f.productIds.indexOf(id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= f.productIds.length) return f;
      const copy = [...f.productIds];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return { ...f, productIds: copy };
    });
  }

  function moveFaq(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const target = idx + dir;
      if (target < 0 || target >= f.faqs.length) return f;
      const copy = [...f.faqs];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return { ...f, faqs: copy };
    });
  }

  /** Builds a valid JSON-LD array (WebPage + FAQPage + ItemList + LocalBusiness) from current form data. */
  function autoGenerateSchema() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://artisticbykhushi.com";
    const url = `${origin}/lp/${form.slug || "your-slug"}`;
    const name = form.metaTitle || form.title || "Landing page";
    const description = form.metaDescription || form.subheadline || "";
    const schemas: Record<string, unknown>[] = [];

    schemas.push({ "@context": "https://schema.org", "@type": "WebPage", name, description, url });

    const faqs = form.faqs.filter((f) => f.question.trim() && f.answer.trim());
    if (faqs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      });
    }

    const selected = form.productIds.map((id) => productById.get(id)).filter((p): p is PublicProduct => !!p);
    if (selected.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Featured pieces — ${name}`,
        itemListElement: selected.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.name,
          url: `${origin}/product/${p.slug}`,
        })),
      });
    }

    const [lat, lng] = form.geoPosition.split(",").map((s) => s.trim());
    schemas.push({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Artistic by Khushiii",
      url: origin,
      image: `${origin}/images/logo.png`,
      address: {
        "@type": "PostalAddress",
        addressLocality: form.geoPlacename || "Surat",
        addressRegion: "Gujarat",
        addressCountry: "IN",
      },
      ...(lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))
        ? { geo: { "@type": "GeoCoordinates", latitude: Number(lat), longitude: Number(lng) } }
        : {}),
    });

    set("schemaJson", JSON.stringify(schemas, null, 2));
    toast({ title: "Schema auto-generated", description: "WebPage + FAQ + ItemList + LocalBusiness JSON-LD ready. Review karke save karo." });
  }

  async function save() {
    setSubmitted(true);
    if (!form.title.trim()) {
      toast({ title: "Landing title is required", variant: "destructive" });
      return;
    }
    if (form.slug && !isValidSlug(form.slug)) {
      toast({ title: "Invalid slug", description: "Lowercase letters, numbers and single hyphens only.", variant: "destructive" });
      return;
    }
    if (slugTaken) {
      toast({ title: "Slug already in use", description: `“${form.slug}” already exists — choose another.`, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      slug: form.slug,
      headline: form.headline,
      subheadline: form.subheadline,
      heroImageUrl: form.heroImageUrl,
      heroMobileImageUrl: form.heroMobileImageUrl,
      bodyHtml: form.bodyHtml,
      ctaText: form.ctaText,
      ctaUrl: form.ctaUrl,
      productIds: JSON.stringify(form.productIds),
      faqsJson: JSON.stringify(form.faqs.filter((f) => f.question.trim() && f.answer.trim())),
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      focusKeyword: form.focusKeyword,
      secondaryKeywords: form.secondaryKeywords,
      canonicalUrl: form.canonicalUrl,
      ogTitle: form.ogTitle,
      ogDescription: form.ogDescription,
      ogImageUrl: form.ogImageUrl,
      noindex: form.noindex,
      geoRegion: form.geoRegion,
      geoPlacename: form.geoPlacename,
      geoPosition: form.geoPosition,
      targetLocations: form.targetLocations,
      llmSummary: form.llmSummary,
      llmKeywords: form.llmKeywords,
      customHtml: form.customHtml,
      customCss: form.customCss,
      customJs: form.customJs,
      schemaJson: form.schemaJson,
      displayOrder: form.displayOrder,
      published: form.published,
    };
    try {
      if (landing) {
        await api.put(`/api/admin/landing/${landing.id}`, payload);
        toast({ title: "Landing saved", description: payload.title });
      } else {
        const res = await api.post<{ landing: AdminLandingPage }>("/api/admin/landing", payload);
        toast({ title: "Landing created", description: `${payload.title} — ab Editor mode me continue kar sakte ho.` });
        onCreated(res.landing);
      }
      void qc.invalidateQueries({ queryKey: ["admin", "landing"] });
      void qc.invalidateQueries({ queryKey: ["landing"] });
      if (!landing) return; // stay in (re-mounted) editor after create
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const faqCount = form.faqs.filter((f) => f.question.trim() && f.answer.trim()).length;
  const llmWords = form.llmSummary.trim() ? form.llmSummary.trim().split(/\s+/).length : 0;

  return (
    <Card className="pt-0">
      {/* Editor header */}
      <CardHeader className="gap-3 border-b p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9" onClick={onClose} disabled={saving}>
            <ChevronLeft className="mr-1 h-4 w-4" /> All landings
          </Button>
          <span className="flex-1" />
          <div className="flex items-center gap-2">
            <Switch id="landing-published" checked={form.published} onCheckedChange={(v) => set("published", v)} />
            <label htmlFor="landing-published" className="text-sm">
              {form.published ? "Published" : "Draft"}
            </label>
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : landing ? "Save changes" : "Create landing"}
          </Button>
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-lg">{landing ? `Edit: ${landing.title}` : "New landing page"}</p>
          <p className="truncate text-xs text-muted-foreground">
            Final URL: <span className="font-mono">{`#/lp/${form.slug || "your-slug"}`}</span>
            {form.published ? "" : " (draft — sirf admin dekh sakta hai publish hone tak)"}
          </p>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="content">
          <div className="overflow-x-auto custom-scroll pb-1">
            <TabsList className="w-full min-w-max">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="products">Products ({form.productIds.length})</TabsTrigger>
              <TabsTrigger value="faq">FAQ ({faqCount})</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="geo">
                <MapPin className="size-3.5" aria-hidden="true" /> GEO
              </TabsTrigger>
              <TabsTrigger value="ai">
                <Bot className="size-3.5" aria-hidden="true" /> AI / LLM
              </TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
          </div>

          {/* ---------------- CONTENT ---------------- */}
          <TabsContent value="content" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" required error={submitted && !form.title.trim() ? "Title is required" : undefined}>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} aria-required placeholder="Diwali Gifting Collection 2025" />
              </Field>
              <Field label="Headline (H1 on page)" hint="Page ka main headline — bada font me dikhega.">
                <Input value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Diwali Gifts That Feel Personal" />
              </Field>
            </div>
            <SlugInput value={form.slug} onChange={(v) => set("slug", v)} from={form.title} />
            {slugTaken ? <p className="text-xs text-destructive">“{form.slug}” already in use — dusra slug chuno.</p> : null}
            <Field label="Subheadline" hint="Headline ke neeche wali supporting line.">
              <Textarea rows={2} value={form.subheadline} onChange={(e) => set("subheadline", e.target.value)} placeholder="Handcrafted resin hampers, nameplates and keepsakes — made to order in Surat, delivered across India." />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hero image (desktop)" hint="Landscape / square crop — landing ke top pe dikhega.">
                <MediaPickField
                  value={form.heroImageUrl}
                  alt={form.headline || form.title || "hero"}
                  onPick={(p) => set("heroImageUrl", p.url)}
                  onClear={() => set("heroImageUrl", "")}
                />
              </Field>
              <Field label="Hero image (mobile) — optional" hint="Phone pe alag portrait crop chahte ho to yahan daalo. Khali chhodo to desktop wali image hi use hogi.">
                <MediaPickField
                  value={form.heroMobileImageUrl}
                  alt={`${form.headline || "hero"} mobile`}
                  onPick={(p) => set("heroMobileImageUrl", p.url)}
                  onClear={() => set("heroMobileImageUrl", "")}
                />
              </Field>
            </div>
            <Field label="Body content" hint="Landing ka main content — rich text toolbar use karo.">
              <RichTextEditor value={form.bodyHtml} onChange={(v) => set("bodyHtml", v)} rows={12} variant="full" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CTA text" hint="Hero + bottom banner me button ka label.">
                <Input value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} placeholder="Shop Diwali Gifts" />
              </Field>
              <Field label="CTA link" hint="Jahan button le jaaye — e.g. #/products ya #/contact.">
                <Input value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="#/products" />
              </Field>
            </div>
          </TabsContent>

          {/* ---------------- PRODUCTS ---------------- */}
          <TabsContent value="products" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Is landing pe dikhane wale products select karo. Order matter karta hai — jo pehla select karoge wahi pehle dikhega.
            </p>

            {/* Selected (ordered) */}
            <Field label={`Selected pieces (${form.productIds.length})`} hint="Chips ke arrows se order badlo — yahi order page pe rahega.">
              {form.productIds.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  Abhi koi product select nahi hua — neeche list se chuno.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {form.productIds.map((id, idx) => {
                    const p = productById.get(id);
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-full border bg-secondary/50 py-1 pl-1.5 pr-2"
                      >
                        <ImageThumb src={p?.featuredImageUrl} alt={p?.featuredImageAlt || p?.name} size={28} className="rounded-full" />
                        <span className="max-w-[10rem] truncate text-sm font-medium">{p?.name ?? "Deleted product"}</span>
                        <span className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="size-6" disabled={idx === 0} onClick={() => moveProduct(id, -1)} aria-label="Move product up">
                            <ArrowUp className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            disabled={idx === form.productIds.length - 1}
                            onClick={() => moveProduct(id, 1)}
                            aria-label="Move product down"
                          >
                            <ArrowDown className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-6 text-destructive" onClick={() => toggleProduct(id)} aria-label="Remove product">
                            <Trash2 className="size-3" />
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Field>

            <Separator />

            {/* Picker */}
            <Field label="Product picker" hint="Search karke checkbox tick karo.">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                  className="pl-9"
                  aria-label="Search products to add"
                />
              </div>
              {productsLoading ? (
                <div className="mt-2 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="mt-2 max-h-96 divide-y overflow-y-auto custom-scroll rounded-lg border" role="listbox" aria-multiselectable aria-label="Products">
                  {filteredProducts.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Koi product match nahi hua.</p>
                  ) : (
                    filteredProducts.map((p) => {
                      const selectedIdx = form.productIds.indexOf(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-3 p-2.5 transition-colors hover:bg-secondary/50"
                        >
                          <Checkbox
                            checked={selectedIdx >= 0}
                            onCheckedChange={() => toggleProduct(p.id)}
                            aria-label={`Select ${p.name}`}
                          />
                          <ImageThumb src={p.featuredImageUrl} alt={p.featuredImageAlt || p.name} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{p.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{p.categoryName}</span>
                          </span>
                          {selectedIdx >= 0 ? (
                            <Badge variant="outline" className="shrink-0">
                              #{selectedIdx + 1}
                            </Badge>
                          ) : null}
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </Field>
          </TabsContent>

          {/* ---------------- FAQ ---------------- */}
          <TabsContent value="faq" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Ye FAQs Google ke FAQ schema (rich results) + AI Overviews ke liye bhi use hote hain — clear, seedha jawab likho.
            </p>
            <div className="space-y-2">
              {form.faqs.map((faq, idx) => (
                <div key={idx} className="rounded-lg border p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 gap-2">
                      <Input
                        value={faq.question}
                        onChange={(e) => setForm((f) => ({ ...f, faqs: f.faqs.map((x, i) => (i === idx ? { ...x, question: e.target.value } : x)) }))}
                        placeholder="Question — e.g. Diwali gifts ka last order date kya hai?"
                        aria-label={`FAQ ${idx + 1} question`}
                      />
                      <Textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => setForm((f) => ({ ...f, faqs: f.faqs.map((x, i) => (i === idx ? { ...x, answer: e.target.value } : x)) }))}
                        placeholder="Answer — seedha, factual jawab jo Google/AI utha sake."
                        aria-label={`FAQ ${idx + 1} answer`}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveFaq(idx, -1)} aria-label="Move FAQ up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === form.faqs.length - 1}
                        onClick={() => moveFaq(idx, 1)}
                        aria-label="Move FAQ down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setForm((f) => ({ ...f, faqs: f.faqs.filter((_, i) => i !== idx) }))}
                        aria-label="Remove FAQ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, faqs: [...f.faqs, { question: "", answer: "" }] }))}>
                <Plus className="mr-1 h-4 w-4" /> Add FAQ
              </Button>
            </div>
          </TabsContent>

          {/* ---------------- SEO ---------------- */}
          <TabsContent value="seo" className="mt-4 space-y-4">
            <GooglePreview
              title={form.metaTitle || form.title || "Landing title"}
              url={`artisticbykhushi.com/lp/${form.slug || "your-slug"}`}
              description={form.metaDescription || form.subheadline}
            />
            <Field label="Meta title" counter={<CharCount text={form.metaTitle} target={60} />} hint="Google me jo blue heading dikhta hai. ~60 characters ideal.">
              <Input value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
            </Field>
            <Field label="Meta description" counter={<CharCount text={form.metaDescription} target={160} />} hint="Google result ke neeche wali line. ~160 characters.">
              <Textarea rows={2} value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Focus keyword" hint="Is page ka primary keyword — e.g. diwali gifts surat.">
                <Input value={form.focusKeyword} onChange={(e) => set("focusKeyword", e.target.value)} />
              </Field>
              <Field label="Secondary keywords" hint="Comma-separated related keywords.">
                <Input value={form.secondaryKeywords} onChange={(e) => set("secondaryKeywords", e.target.value)} placeholder="diwali hampers, festive gifting, resin gifts" />
              </Field>
            </div>
            <Field label="Canonical URL" hint="Agar ye content kisi aur URL ka copy hai to wahan ka URL. Khali chhodo to auto.">
              <Input value={form.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://artisticbykhushiii.com/lp/…" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="OG title" hint="WhatsApp / Facebook share ka title.">
                <Input value={form.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />
              </Field>
              <Field label="OG description" hint="Share card ke neeche wali line.">
                <Input value={form.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} />
              </Field>
            </div>
            <Field label="OG image" hint="Share card ki image (1200×630 ideal).">
              <MediaPickField value={form.ogImageUrl} alt="Open Graph image" onPick={(p) => set("ogImageUrl", p.url)} onClear={() => set("ogImageUrl", "")} />
            </Field>
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Switch id="landing-noindex" checked={form.noindex} onCheckedChange={(v) => set("noindex", v)} />
                  <label htmlFor="landing-noindex" className="text-sm font-medium">
                    noindex
                  </label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Warning: noindex on karo to Google is page ko search me kabhi nahi dikhayega. Sirf temporary/ads-only pages ke liye use karo.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ---------------- GEO ---------------- */}
          <TabsContent value="geo" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Local search optimization — “near me” aur city-wise searches ke liye. Jo city target kar rahe ho uske hisaab se bharo.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Geo region" hint="ISO code — jaise IN-GJ (India-Gujarat).">
                <Input value={form.geoRegion} onChange={(e) => set("geoRegion", e.target.value)} placeholder="IN-GJ" />
              </Field>
              <Field label="Geo placename" hint="Main city — jaise Surat.">
                <Input value={form.geoPlacename} onChange={(e) => set("geoPlacename", e.target.value)} placeholder="Surat" />
              </Field>
              <Field label="Geo position" hint="Latitude, Longitude — jaise 21.1702,72.8311.">
                <Input value={form.geoPosition} onChange={(e) => set("geoPosition", e.target.value)} placeholder="21.1702,72.8311" />
              </Field>
              <Field label="Target locations" hint="Comma-separated cities — jaise Surat, Ahmedabad, Mumbai, Bharuch.">
                <Input value={form.targetLocations} onChange={(e) => set("targetLocations", e.target.value)} placeholder="Surat, Ahmedabad, Mumbai, Bharuch" />
              </Field>
            </div>
          </TabsContent>

          {/* ---------------- AI / LLM ---------------- */}
          <TabsContent value="ai" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              AIO (AI Overviews) optimization — Google AI, ChatGPT, Perplexity jaise assistants is page ko reference ke roop me utha sakte hain.
            </p>
            <Field
              label="LLM summary"
              hint="60-80 words ka crisp summary — Google AI Overviews aur ChatGPT jaise tools isko utha sakte hain."
              counter={<span className={`text-xs ${llmWords > 100 ? "text-destructive font-medium" : "text-muted-foreground"}`}>{llmWords} words</span>}
            >
              <Textarea rows={5} value={form.llmSummary} onChange={(e) => set("llmSummary", e.target.value)} placeholder="Artistic by Khushi offers handcrafted Diwali gifting made to order in Surat — resin nameplates, personalised hampers, tealight holders and memory keepsakes, delivered across India in 5-7 days…" />
            </Field>
            <Field label="LLM keywords" hint="Natural phrases jo log AI assistants se poochte hain — comma-separated.">
              <Textarea
                rows={2}
                value={form.llmKeywords}
                onChange={(e) => set("llmKeywords", e.target.value)}
                placeholder="best handmade diwali gifts india, personalized diwali gifts under 2000, unique resin gifts for diwali"
              />
            </Field>
            <div className="flex items-start gap-3 rounded-lg border bg-secondary/50 p-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">
                Tip: summary me facts rakho (kya, kahan, kitne din, price range) — AI tools factual sentences prefer karte hain.
              </p>
            </div>
          </TabsContent>

          {/* ---------------- ADVANCED ---------------- */}
          <TabsContent value="advanced" className="mt-4 space-y-4">
            <Field
              label="Custom HTML"
              hint="Page ke end me render hota hai. Sirf trust karte ho to use karo — galat HTML layout tod sakta hai."
            >
              <Textarea rows={4} value={form.customHtml} onChange={(e) => set("customHtml", e.target.value)} className="font-mono text-xs" placeholder="<div class=…> … </div>" />
            </Field>
            <Field label="Custom CSS" hint="Is page pe hi apply hota hai.">
              <Textarea rows={4} value={form.customCss} onChange={(e) => set("customCss", e.target.value)} className="font-mono text-xs" placeholder=".my-banner { … }" />
            </Field>
            <Field label="Custom JavaScript" hint="Warning: galat JS pura page freeze kar sakta hai. Sirf zaroorat ho to.">
              <Textarea rows={4} value={form.customJs} onChange={(e) => set("customJs", e.target.value)} className="font-mono text-xs" placeholder="console.log('hello');" />
            </Field>
            <Field
              label="Schema JSON-LD"
              hint="Structured data — Google rich results + AI samajhne ke liye. Auto-Generate button se base banao, phir customize karo."
              counter={
                <Button type="button" variant="outline" size="sm" className="h-7" onClick={autoGenerateSchema}>
                  <Wand2 className="mr-1 h-3.5 w-3.5" /> Auto-Generate Schema
                </Button>
              }
            >
              <Textarea rows={8} value={form.schemaJson} onChange={(e) => set("schemaJson", e.target.value)} className="font-mono text-xs" placeholder='[ { "@context": "https://schema.org", … } ]' />
            </Field>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="landing-published-adv" checked={form.published} onCheckedChange={(v) => set("published", v)} />
                <label htmlFor="landing-published-adv" className="text-sm">
                  Published
                </label>
              </div>
              <Field label="Display order">
                <Input type="number" value={form.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value) || 0)} className="w-24" />
              </Field>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : landing ? "Save changes" : "Create landing"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
