"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Eye, FolderTree, Pencil, Plus, Save, Star, Trash2 } from "lucide-react";
import { useAdminCategories, type AdminCategory } from "./useAdminData";
import { PUBLIC_CACHE_KEYS } from "./useAdminData";
import { CharCount, ConfirmDialog, EmptyState, Field, GooglePreview, ImageThumb, PublishedBadge, SlugInput, Spinner } from "./shared";
import { RichTextEditor } from "./rich-text-editor";
import { MediaPickField } from "./media-picker";
import { errMsg } from "./admin-utils";

// ============================================================
// Categories module — table + dialog form + reorder.
// ============================================================

export function CategoriesManager({ createSignal }: { createSignal?: number }) {
  const { data: categories, isLoading } = useAdminCategories();
  const qc = useQueryClient();
  const { toast } = useToast();
  const catKey = ["admin", "categories"] as const;

  const [editing, setEditing] = useState<AdminCategory | "new" | null>(createSignal ? "new" : null);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [forceMsg, setForceMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  function patchCategory(id: string, patch: Partial<AdminCategory>) {
    const prev = qc.getQueryData<AdminCategory[]>(catKey);
    if (prev) qc.setQueryData(catKey, prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    return prev;
  }

  /** Optimistic toggle (published/featured). */
  function toggleField(cat: AdminCategory, field: "published" | "featured") {
    const prev = patchCategory(cat.id, { [field]: !cat[field] } as Partial<AdminCategory>);
    const nextVal = !cat[field];
    api
      .put(`/api/admin/categories/${cat.id}`, { [field]: nextVal })
      .then(() => {
        toast({ title: field === "published" ? (nextVal ? "Category published" : "Category hidden") : nextVal ? "Marked as featured" : "Removed from featured", description: cat.name });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => {
        if (prev) qc.setQueryData(catKey, prev);
        toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
      });
  }

  /** Save displayOrder on blur. */
  function saveOrder(cat: AdminCategory, order: number) {
    if (order === cat.displayOrder) return;
    patchCategory(cat.id, { displayOrder: order });
    api
      .put(`/api/admin/categories/${cat.id}`, { displayOrder: order })
      .then(() => {
        void qc.invalidateQueries({ queryKey: catKey });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => {
        toast({ title: "Could not save order", description: errMsg(e), variant: "destructive" });
        void qc.invalidateQueries({ queryKey: catKey });
      });
  }

  /** Swap displayOrder with the neighbour and persist both. */
  function reorder(idx: number, dir: -1 | 1) {
    const list = qc.getQueryData<AdminCategory[]>(catKey);
    if (!list) return;
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[idx];
    const b = list[target];
    const reordered = [...list];
    reordered[idx] = { ...b, displayOrder: a.displayOrder };
    reordered[target] = { ...a, displayOrder: b.displayOrder };
    qc.setQueryData(catKey, reordered);
    Promise.all([
      api.put(`/api/admin/categories/${a.id}`, { displayOrder: b.displayOrder }),
      api.put(`/api/admin/categories/${b.id}`, { displayOrder: a.displayOrder }),
    ])
      .then(() => {
        toast({ title: "Order updated", description: `${b.name} now comes before ${a.name}.` });
        void qc.invalidateQueries({ queryKey: catKey });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => {
        toast({ title: "Reorder failed", description: errMsg(e), variant: "destructive" });
        void qc.invalidateQueries({ queryKey: catKey });
      });
  }

  function attemptDelete(force = false) {
    if (!toDelete) return;
    setDeleting(true);
    api
      .delete(`/api/admin/categories/${toDelete.id}${force ? "?force=true" : ""}`)
      .then(() => {
        toast({
          title: "Category deleted",
          description: force ? `${toDelete.name} and its products were removed.` : toDelete.name,
        });
        setToDelete(null);
        setForceMsg("");
        void qc.invalidateQueries({ queryKey: catKey });
        void qc.invalidateQueries({ queryKey: ["admin", "products"] });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => {
        const msg = errMsg(e);
        const is409 = e instanceof Error && "status" in e && (e as { status: number }).status === 409;
        if (is409) {
          // category still has products — offer the force option (toDelete stays set)
          setForceMsg(msg);
        } else {
          toast({ title: "Delete failed", description: msg, variant: "destructive" });
        }
      })
      .finally(() => setDeleting(false));
  }

  const list = categories ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Catalogue sections shown in the website menu & homepage.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1 h-4 w-4" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<FolderTree className="h-8 w-8 text-muted-foreground/50" />} title="No categories yet" hint="Create categories like Nameplates, Wall Décor, Trays…" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-20 text-center">Products</TableHead>
                  <TableHead className="w-24">Published</TableHead>
                  <TableHead className="w-20">Featured</TableHead>
                  <TableHead className="w-20 text-center">Order</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c, idx) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <ImageThumb src={c.imageUrl} alt={c.imageAlt} size={40} />
                    </TableCell>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => setEditing(c)}>
                        <p className="font-medium hover:text-primary">{c.name}</p>
                        <p className="text-xs text-muted-foreground">/{c.slug}</p>
                      </button>
                    </TableCell>
                    <TableCell className="text-center text-sm">{c.productCount}</TableCell>
                    <TableCell>
                      <Switch checked={c.published} onCheckedChange={() => toggleField(c, "published")} aria-label={`Toggle published for ${c.name}`} />
                    </TableCell>
                    <TableCell>
                      <button type="button" onClick={() => toggleField(c, "featured")} className="rounded p-1 hover:bg-secondary" aria-label={`Toggle featured for ${c.name}`} aria-pressed={c.featured}>
                        <Star className={`h-4 w-4 ${c.featured ? "text-gold" : "text-muted-foreground/40"}`} fill={c.featured ? "currentColor" : "none"} />
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        defaultValue={c.displayOrder}
                        onBlur={(e) => saveOrder(c, Number(e.target.value) || 0)}
                        className="h-8 w-14 text-center"
                        aria-label={`Display order for ${c.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => reorder(idx, -1)} aria-label="Move up">
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === list.length - 1} onClick={() => reorder(idx, 1)} aria-label="Move down">
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <a href={`#/category/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary" title="Preview" aria-label={`Preview ${c.name}`}>
                          <Eye className="h-4 w-4" />
                        </a>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(c)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(c)} aria-label="Delete">
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
            {list.map((c, idx) => (
              <Card key={c.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <ImageThumb src={c.imageUrl} alt={c.imageAlt} size={52} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => setEditing(c)} className="text-left min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">/{c.slug}</p>
                        </button>
                        <PublishedBadge published={c.published} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{c.productCount} products</Badge>
                        <button type="button" onClick={() => toggleField(c, "featured")} aria-label="Toggle featured">
                          <Star className={`h-4 w-4 ${c.featured ? "text-gold" : "text-muted-foreground/40"}`} fill={c.featured ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Switch checked={c.published} onCheckedChange={() => toggleField(c, "published")} aria-label="Toggle published" />
                        <span className="text-[11px] text-muted-foreground">{c.published ? "Published" : "Hidden"}</span>
                        <span className="flex-1" />
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => reorder(idx, -1)} aria-label="Move up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx === list.length - 1} onClick={() => reorder(idx, 1)} aria-label="Move down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <a href={`#/category/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded-md border" aria-label="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                        <Button variant="outline" size="icon" className="h-7 w-7 text-destructive" onClick={() => setToDelete(c)} aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* category form */}
      {editing !== null ? (
        <CategoryFormDialog
          category={editing === "new" ? null : editing}
          all={list}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {/* delete confirm */}
      <ConfirmDialog
        open={!!toDelete && !forceMsg}
        onOpenChange={(o) => {
          if (!o) {
            setToDelete(null);
            setForceMsg("");
          }
        }}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        description="The category will be removed from the website. Products in it are kept (they will need a new category)."
        confirmLabel="Delete category"
        onConfirm={() => attemptDelete(false)}
        pending={deleting}
      />

      {/* 409 force delete */}
      <ConfirmDialog
        open={!!forceMsg}
        onOpenChange={(o) => {
          if (!o) {
            setForceMsg("");
            setToDelete(null);
          }
        }}
        title="Category still has products"
        description={`${forceMsg} Deleting anyway will permanently remove those products and their images.`}
        confirmLabel="Delete anyway (force)"
        onConfirm={() => attemptDelete(true)}
        pending={deleting}
        destructive
      />
    </div>
  );
}

// ============================================================
// Category form dialog
// ============================================================

interface CategoryFormState {
  name: string;
  slug: string;
  imageUrl: string;
  imageAlt: string;
  shortDescription: string;
  longDescription: string;
  introContent: string;
  bottomContent: string;
  featured: boolean;
  published: boolean;
  displayOrder: number;
  parentId: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
}

const EMPTY_CATEGORY: CategoryFormState = {
  name: "",
  slug: "",
  imageUrl: "",
  imageAlt: "",
  shortDescription: "",
  longDescription: "",
  introContent: "",
  bottomContent: "",
  featured: false,
  published: true,
  displayOrder: 0,
  parentId: "",
  seoTitle: "",
  metaDescription: "",
  focusKeyword: "",
  secondaryKeywords: "",
  ogTitle: "",
  ogDescription: "",
  canonicalUrl: "",
};

function CategoryFormDialog({
  category,
  all,
  onClose,
}: {
  category: AdminCategory | null;
  all: AdminCategory[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<CategoryFormState>(EMPTY_CATEGORY);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const initRef = useRef(false);

  useEffect(() => {
    if (category && !initRef.current) {
      initRef.current = true;
      setForm({
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        imageAlt: category.imageAlt,
        shortDescription: category.shortDescription,
        longDescription: category.longDescription,
        introContent: category.introContent,
        bottomContent: category.bottomContent,
        featured: category.featured,
        published: category.published,
        displayOrder: category.displayOrder,
        parentId: category.parentId ?? "",
        seoTitle: category.seoTitle,
        metaDescription: category.metaDescription,
        focusKeyword: category.focusKeyword,
        secondaryKeywords: category.secondaryKeywords,
        ogTitle: category.ogTitle,
        ogDescription: category.ogDescription,
        canonicalUrl: category.canonicalUrl,
      });
    }
    if (!category) initRef.current = true;
  }, [category]);

  function set<K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSubmitted(true);
    if (!form.name.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      name: form.name.trim(),
      slug: form.slug,
      imageUrl: form.imageUrl,
      imageAlt: form.imageAlt,
      shortDescription: form.shortDescription,
      longDescription: form.longDescription,
      introContent: form.introContent,
      bottomContent: form.bottomContent,
      featured: form.featured,
      published: form.published,
      displayOrder: form.displayOrder,
      parentId: form.parentId || null,
      seoTitle: form.seoTitle,
      metaDescription: form.metaDescription,
      focusKeyword: form.focusKeyword,
      secondaryKeywords: form.secondaryKeywords,
      ogTitle: form.ogTitle,
      ogDescription: form.ogDescription,
      canonicalUrl: form.canonicalUrl,
    };
    try {
      if (category) {
        await api.put(`/api/admin/categories/${category.id}`, body);
      } else {
        await api.post("/api/admin/categories", body);
      }
      toast({ title: "Category saved", description: form.name });
      void qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const parentOptions = all.filter((c) => c.id !== category?.id);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle className="font-display">{category ? `Edit category: ${category.name}` : "New category"}</DialogTitle>
          <DialogDescription>Categories group your products on the website.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={submitted && !form.name.trim() ? "Name is required" : undefined}>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Nameplates" aria-required />
              </Field>
              <Field label="Display order">
                <Input type="number" value={form.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value) || 0)} className="w-28" />
              </Field>
            </div>
            <SlugInput value={form.slug} onChange={(v) => set("slug", v)} from={form.name} />
            <Field label="Parent category" hint="Optional — creates a subcategory.">
              <Select value={form.parentId} onValueChange={(v) => set("parentId", v === "__none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="— none —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— none —</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Image">
              <MediaPickField
                value={form.imageUrl}
                alt={form.imageAlt}
                onPick={(pick) => {
                  set("imageUrl", pick.url);
                  set("imageAlt", pick.alt);
                }}
                onClear={() => {
                  set("imageUrl", "");
                  set("imageAlt", "");
                }}
              />
            </Field>
            <Field label="Image alt text">
              <Input value={form.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} placeholder="Resin nameplate on a wooden door" />
            </Field>
            <Field label="Short description" counter={<CharCount text={form.shortDescription} target={160} />}>
              <Textarea rows={2} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </Field>
            <Field label="Long description">
              <RichTextEditor value={form.longDescription} onChange={(v) => set("longDescription", v)} rows={6} />
            </Field>
            <Field label="Intro content" hint="Optional HTML shown above the product grid.">
              <RichTextEditor value={form.introContent} onChange={(v) => set("introContent", v)} rows={5} />
            </Field>
            <Field label="Bottom content" hint="Optional HTML shown below the product grid.">
              <RichTextEditor value={form.bottomContent} onChange={(v) => set("bottomContent", v)} rows={5} />
            </Field>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch id="cat-published" checked={form.published} onCheckedChange={(v) => set("published", v)} />
                <label htmlFor="cat-published" className="text-sm">Published</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="cat-featured" checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
                <label htmlFor="cat-featured" className="text-sm">Featured on homepage</label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="mt-4 space-y-4">
            <GooglePreview
              title={form.seoTitle || form.name || "Category title"}
              url={`artisticbykhushi.com/category/${form.slug || "your-slug"}`}
              description={form.metaDescription || form.shortDescription}
            />
            <Field label="SEO title" counter={<CharCount text={form.seoTitle} target={60} />}>
              <Input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </Field>
            <Field label="Meta description" counter={<CharCount text={form.metaDescription} target={160} />}>
              <Textarea rows={2} value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Focus keyword">
                <Input value={form.focusKeyword} onChange={(e) => set("focusKeyword", e.target.value)} />
              </Field>
              <Field label="Secondary keywords" hint="Comma separated">
                <Input value={form.secondaryKeywords} onChange={(e) => set("secondaryKeywords", e.target.value)} />
              </Field>
              <Field label="OG title">
                <Input value={form.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />
              </Field>
              <Field label="Canonical URL">
                <Input value={form.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://…" />
              </Field>
            </div>
            <Field label="OG description">
              <Textarea rows={2} value={form.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} />
            </Field>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : "Save category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
