"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { Paginated, ProductImage, PublicProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Eye,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useAdminCategories, useAdminFaqs, useAdminProduct, useAdminProducts } from "./useAdminData";
import { PUBLIC_CACHE_KEYS } from "./useAdminData";
import { CharCount, ConfirmDialog, EmptyState, Field, GooglePreview, ImageThumb, PaginationBar, PublishedBadge, SlugInput, Spinner } from "./shared";
import { RichTextEditor } from "./rich-text-editor";
import { MediaPickerDialog } from "./media-picker";
import { errMsg, timeAgo, useDebounced } from "./admin-utils";

// ============================================================
// Products module — list + full editor form.
// ============================================================

type ImageRow = Omit<ProductImage, "id"> & { id?: string };
type FaqRow = { id?: string; question: string; answer: string };

interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  subcategory: string;
  shortDescription: string;
  longDescription: string;
  highlights: string;
  customizationOptions: string;
  tags: string;
  images: ImageRow[];
  size: string;
  material: string;
  colour: string;
  occasion: string;
  careInstructions: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  faqs: FaqRow[];
  published: boolean;
  featured: boolean;
  displayOrder: number;
  relatedProductIds: string[];
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  slug: "",
  sku: "",
  categoryId: "",
  subcategory: "",
  shortDescription: "",
  longDescription: "",
  highlights: "",
  customizationOptions: "",
  tags: "",
  images: [],
  size: "",
  material: "",
  colour: "",
  occasion: "",
  careInstructions: "",
  seoTitle: "",
  metaDescription: "",
  focusKeyword: "",
  secondaryKeywords: "",
  ogTitle: "",
  ogDescription: "",
  canonicalUrl: "",
  faqs: [],
  published: true,
  featured: false,
  displayOrder: 0,
  relatedProductIds: [],
};

export function ProductsManager({
  jump,
  createSignal,
  editId,
}: {
  jump?: { q: string; n: number };
  createSignal?: number;
  editId?: string;
}) {
  // NOTE: the parent remounts this component (via key) whenever a signal
  // changes, so initialising state from the props below is safe.
  const [view, setView] = useState<"list" | "form">(createSignal ? "form" : "list");
  const [editingId, setEditingId] = useState<string | null>(createSignal ? null : (editId ?? null));

  // toolbar state
  const [q, setQ] = useState(jump?.q ?? "");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const debouncedQ = useDebounced(q);

  const params = { page, pageSize, q: debouncedQ, category, status };
  const { data, isLoading, isFetching } = useAdminProducts(params);
  const { data: categories } = useAdminCategories();
  const qc = useQueryClient();
  const { toast } = useToast();

  const productsKey = ["admin", "products", page, pageSize, debouncedQ, category, status] as const;

  // ---------- optimistic toggles ----------
  function toggleField(product: PublicProduct, field: "published" | "featured") {
    const prev = qc.getQueryData<Paginated<PublicProduct>>(productsKey);
    if (prev) {
      qc.setQueryData(productsKey, {
        ...prev,
        items: prev.items.map((p) => (p.id === product.id ? { ...p, [field]: !p[field] } : p)),
      });
    }
    const nextVal = !product[field];
    api
      .put(`/api/admin/products/${product.id}`, { [field]: nextVal })
      .then(() => {
        toast({
          title: field === "published" ? (nextVal ? "Product published" : "Moved to drafts") : nextVal ? "Marked as featured" : "Removed from featured",
          description: product.name,
        });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => {
        if (prev) qc.setQueryData(productsKey, prev);
        toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
      });
  }

  // ---------- delete ----------
  const [toDelete, setToDelete] = useState<PublicProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    api
      .delete(`/api/admin/products/${toDelete.id}`)
      .then(() => {
        toast({ title: "Product deleted", description: `${toDelete.name} and its images were permanently removed.` });
        setToDelete(null);
        void qc.invalidateQueries({ queryKey: ["admin", "products"] });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  if (view === "form") {
    return (
      <ProductForm
        id={editingId}
        onBack={() => {
          setView("list");
          setEditingId(null);
          void qc.invalidateQueries({ queryKey: ["admin", "products"] });
        }}
      />
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name, SKU…" className="pl-8" aria-label="Search products" />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingId(null); setView("form"); }}>
          <Plus className="mr-1 h-4 w-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-muted-foreground/50" />}
          title="No products found"
          hint={debouncedQ || category !== "all" || status !== "all" ? "Try changing the search or filters." : "Create your first product to start the catalogue."}
          action={
            <Button className="mt-2" onClick={() => { setEditingId(null); setView("form"); }}>
              <Plus className="mr-1 h-4 w-4" /> Add Product
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-24">Published</TableHead>
                  <TableHead className="w-20">Featured</TableHead>
                  <TableHead className="w-16 text-center">Order</TableHead>
                  <TableHead className="w-32">Updated</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id} className={isFetching ? "opacity-60" : ""}>
                    <TableCell>
                      <ImageThumb src={p.featuredImageUrl} alt={p.featuredImageAlt} size={44} />
                    </TableCell>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => { setEditingId(p.id); setView("form"); }}>
                        <p className="font-medium hover:text-primary">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku ? `SKU ${p.sku}` : "no SKU"}</p>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="max-w-36 truncate">{p.categoryName}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={p.published} onCheckedChange={() => toggleField(p, "published")} aria-label={`Toggle published for ${p.name}`} />
                        <span className="text-[11px] text-muted-foreground">{p.published ? "Live" : "Draft"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleField(p, "featured")}
                        className="rounded p-1 hover:bg-secondary"
                        aria-label={`Toggle featured for ${p.name}`}
                        aria-pressed={p.featured}
                      >
                        <Star className={`h-4 w-4 ${p.featured ? "text-gold" : "text-muted-foreground/40"}`} fill={p.featured ? "currentColor" : "none"} />
                      </button>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{p.displayOrder}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(p.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => { setEditingId(p.id); setView("form"); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <a
                          href={`#/product/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary"
                          title="Preview on site"
                          aria-label={`Preview ${p.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => setToDelete(p)}>
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
            {items.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex gap-3 p-3">
                  <ImageThumb src={p.featuredImageUrl} alt={p.featuredImageAlt} size={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="text-left min-w-0" onClick={() => { setEditingId(p.id); setView("form"); }}>
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku ? `SKU ${p.sku}` : "no SKU"}</p>
                      </button>
                      <PublishedBadge published={p.published} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="max-w-36 truncate">{p.categoryName}</Badge>
                      <button type="button" onClick={() => toggleField(p, "featured")} aria-label="Toggle featured">
                        <Star className={`h-4 w-4 ${p.featured ? "text-gold" : "text-muted-foreground/40"}`} fill={p.featured ? "currentColor" : "none"} />
                      </button>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(p.updatedAt)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <Switch checked={p.published} onCheckedChange={() => toggleField(p, "published")} aria-label="Toggle published" />
                      <span className="text-[11px] text-muted-foreground">{p.published ? "Published" : "Draft"}</span>
                      <span className="flex-1" />
                      <a href={`#/product/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary" aria-label="Preview">
                        <Eye className="h-4 w-4" />
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(p)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PaginationBar page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onPage={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        description="This permanently deletes the product and its images. This cannot be undone."
        confirmLabel="Delete product"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}

// ============================================================
// Product form — tabbed full editor.
// ============================================================

function ProductForm({ id, onBack }: { id: string | null; onBack: () => void }) {
  const [currentId, setCurrentId] = useState<string | null>(id);
  const isNew = !currentId;
  const { data: product, isLoading } = useAdminProduct(currentId);
  const { data: categories } = useAdminCategories();
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [initialFaqIds, setInitialFaqIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("basics");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [relatedQ, setRelatedQ] = useState("");
  const initRef = useRef<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  // FAQ list for this product (to diff on save)
  const { data: productFaqs } = useAdminFaqs("");
  const productFaqList = useMemo(
    () => (productFaqs ?? []).filter((f) => f.entityType === "PRODUCT" && f.entityId === currentId),
    [productFaqs, currentId],
  );

  // load existing product into form once (waits for both product and the
  // FAQ list so the FAQs tab is pre-filled without a race)
  useEffect(() => {
    if (!product || !productFaqs || initRef.current === product.id) return;
    initRef.current = product.id;
    const faqs = productFaqs
      .filter((f) => f.entityType === "PRODUCT" && f.entityId === product.id)
      .map((f) => ({ id: f.id, question: f.question, answer: f.answer }));
    setInitialFaqIds(faqs.map((f) => f.id as string));
    setForm({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categoryId: product.categoryId,
      subcategory: product.subcategory,
      shortDescription: product.shortDescription,
      longDescription: product.longDescription,
      highlights: product.highlights,
      customizationOptions: product.customizationOptions,
      tags: product.tags,
      images: product.gallery.map((g) => ({ ...g })),
      size: product.size,
      material: product.material,
      colour: product.colour,
      occasion: product.occasion,
      careInstructions: product.careInstructions,
      seoTitle: product.seoTitle,
      metaDescription: product.metaDescription,
      focusKeyword: product.focusKeyword,
      secondaryKeywords: product.secondaryKeywords,
      ogTitle: product.ogTitle,
      ogDescription: product.ogDescription,
      canonicalUrl: product.canonicalUrl,
      faqs,
      published: product.published,
      featured: product.featured,
      displayOrder: product.displayOrder,
      relatedProductIds: safeParseIds(product.relatedProductIds),
    });
  }, [product, productFaqs]);

  function set<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // all products for related picker
  const { data: allProducts } = useAdminProducts({ page: 1, pageSize: 200, q: "", category: "", status: "all" });
  const relatedOptions = useMemo(() => {
    const list = (allProducts?.items ?? []).filter((p) => p.id !== currentId);
    const needle = relatedQ.trim().toLowerCase();
    return needle ? list.filter((p) => p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle)) : list;
  }, [allProducts, currentId, relatedQ]);

  const nameError = submitted && !form.name.trim() ? "Product name is required." : undefined;
  const categoryError = submitted && !form.categoryId ? "Please choose a category." : undefined;

  // ---------- images ----------
  function addImage(url: string, alt: string) {
    setForm((f) => ({
      ...f,
      images: [
        ...f.images,
        { id: undefined, url, alt, caption: "", isFeatured: f.images.length === 0, displayOrder: f.images.length },
      ],
    }));
  }

  function updateImage(idx: number, patch: Partial<ImageRow>) {
    setForm((f) => ({ ...f, images: f.images.map((img, i) => (i === idx ? { ...img, ...patch } : img)) }));
  }

  function removeImage(idx: number) {
    setForm((f) => {
      const images = f.images.filter((_, i) => i !== idx);
      if (images.length > 0 && !images.some((i) => i.isFeatured)) images[0].isFeatured = true;
      return { ...f, images };
    });
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const images = [...f.images];
      const target = idx + dir;
      if (target < 0 || target >= images.length) return f;
      [images[idx], images[target]] = [images[target], images[idx]];
      images.forEach((img, i) => (img.displayOrder = i));
      return { ...f, images };
    });
  }

  function setFeaturedImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.map((img, i) => ({ ...img, isFeatured: i === idx })) }));
  }

  // ---------- faqs ----------
  function addFaqRow() {
    set("faqs", [...form.faqs, { question: "", answer: "" }]);
  }
  function updateFaqRow(idx: number, patch: Partial<FaqRow>) {
    set("faqs", form.faqs.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }
  function removeFaqRow(idx: number) {
    set("faqs", form.faqs.filter((_, i) => i !== idx));
  }

  // ---------- SEO defaults ----------
  function generateSeoDefaults() {
    setForm((f) => ({
      ...f,
      seoTitle: f.seoTitle || `${f.name || "Product"} | Artistic by Khushi`,
      metaDescription: f.metaDescription || f.shortDescription.slice(0, 155),
      ogTitle: f.ogTitle || `${f.name} | Artistic by Khushi`,
      ogDescription: f.ogDescription || f.shortDescription.slice(0, 155),
    }));
    toast({ title: "SEO defaults filled", description: "Empty SEO fields were auto-filled from the product name and short description." });
  }

  // ---------- save ----------
  async function save() {
    setSubmitted(true);
    if (!form.name.trim() || !form.categoryId) {
      setTab("basics");
      toast({ title: "Please fill the required fields", description: "Product name and category are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 1. save product
      const body = {
        name: form.name.trim(),
        slug: form.slug,
        sku: form.sku,
        categoryId: form.categoryId,
        subcategory: form.subcategory,
        shortDescription: form.shortDescription,
        longDescription: form.longDescription,
        highlights: form.highlights,
        customizationOptions: form.customizationOptions,
        tags: form.tags,
        images: form.images.map((img) => ({
          ...(img.id ? { id: img.id } : {}),
          url: img.url,
          alt: img.alt,
          caption: img.caption,
          isFeatured: img.isFeatured,
          displayOrder: img.displayOrder,
        })),
        size: form.size,
        material: form.material,
        colour: form.colour,
        occasion: form.occasion,
        careInstructions: form.careInstructions,
        seoTitle: form.seoTitle,
        metaDescription: form.metaDescription,
        focusKeyword: form.focusKeyword,
        secondaryKeywords: form.secondaryKeywords,
        ogTitle: form.ogTitle,
        ogDescription: form.ogDescription,
        canonicalUrl: form.canonicalUrl,
        published: form.published,
        featured: form.featured,
        displayOrder: form.displayOrder,
        relatedProductIds: JSON.stringify(form.relatedProductIds),
      };
      let productId: string;
      if (isNew) {
        const res = await api.post<{ product: PublicProduct }>("/api/admin/products", body);
        productId = res.product.id;
      } else {
        const res = await api.put<{ product: PublicProduct }>(`/api/admin/products/${currentId}`, body);
        productId = res.product.id;
      }

      // 2. sync FAQs (diff by id)
      const keptIds = new Set(form.faqs.filter((f) => f.id).map((f) => f.id as string));
      for (const faqId of initialFaqIds) {
        if (!keptIds.has(faqId)) await api.delete(`/api/admin/faqs/${faqId}`);
      }
      for (const faq of form.faqs) {
        if (!faq.question.trim() || !faq.answer.trim()) continue;
        if (faq.id) {
          await api.put(`/api/admin/faqs/${faq.id}`, { question: faq.question, answer: faq.answer });
        } else {
          await api.post("/api/admin/faqs", {
            question: faq.question,
            answer: faq.answer,
            entityType: "PRODUCT",
            entityId: productId,
            displayOrder: 0,
            published: true,
          });
        }
      }

      toast({ title: "Product saved", description: form.name });
      for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
      setInitialFaqIds(form.faqs.filter((f) => f.id).map((f) => f.id as string));

      if (isNew) {
        // stay on the form with the new id for further edits
        setCurrentId(productId);
      }
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> All products
        </Button>
        <h2 className="font-display text-lg font-semibold">
          {isNew ? "New Product" : `Edit: ${form.name || product?.name || ""}`}
        </h2>
        {isNew ? <Badge variant="secondary">Not saved yet</Badge> : <PublishedBadge published={form.published} />}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="images">Images {form.images.length ? `(${form.images.length})` : ""}</TabsTrigger>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="faqs">FAQs {form.faqs.length ? `(${form.faqs.length})` : ""}</TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
        </TabsList>

        {/* -------- Basics -------- */}
        <TabsContent value="basics" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product name" required error={nameError}>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Personalized Resin Nameplate" aria-required />
            </Field>
            <Field label="SKU" hint="Stock keeping unit — your internal product code">
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="ABK-NP-001" />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SlugInput value={form.slug} onChange={(v) => set("slug", v)} from={form.name} />
            <Field label="Category" required error={categoryError}>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger aria-required>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Subcategory" hint="Optional — e.g. “Wall Décor” within Nameplates">
            <Input value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} />
          </Field>
          <Field
            label="Short description"
            counter={<CharCount text={form.shortDescription} target={160} />}
            hint="One or two lines shown in listings and search results. Aim for ≤160 characters."
          >
            <Textarea rows={2} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="A handcrafted resin nameplate personalised with your family name…" />
          </Field>
          <Field label="Long description" hint="Full story shown on the product page.">
            <RichTextEditor value={form.longDescription} onChange={(v) => set("longDescription", v)} rows={10} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Highlights" hint="One per line — shown as bullet points.">
              <Textarea rows={4} value={form.highlights} onChange={(e) => set("highlights", e.target.value)} placeholder={"Hand-poured resin\nCustom names & colours\nReady to hang"} />
            </Field>
            <Field label="Customization options" hint="One per line — choices offered to buyers.">
              <Textarea rows={4} value={form.customizationOptions} onChange={(e) => set("customizationOptions", e.target.value)} placeholder={"Name / text to embed\nBase colour\nFinish — glossy / matte"} />
            </Field>
          </div>
          <Field label="Tags" hint="Comma separated — used for search & related content.">
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="resin, nameplate, personalized, gift" />
          </Field>
        </TabsContent>

        {/* -------- Images -------- */}
        <TabsContent value="images" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
              <ImagePlus className="mr-1 h-4 w-4" /> Add from Media Library
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const url = window.prompt("Paste the image URL:");
                if (url && url.trim()) addImage(url.trim(), "");
              }}
            >
              + Paste URL
            </Button>
            <p className="text-xs text-muted-foreground">The first image is used as the featured photo if none is marked.</p>
          </div>

          {form.images.length === 0 ? (
            <EmptyState icon={<ImagePlus className="h-8 w-8 text-muted-foreground/50" />} title="No images yet" hint="Add at least one photo — listings look much better with images." />
          ) : (
            <ul className="space-y-2" role="list">
              {form.images.map((img, idx) => (
                <li key={idx} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <ImageThumb src={img.url} alt={img.alt} size={64} />
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <Field label="Image URL">
                        <Input value={img.url} onChange={(e) => updateImage(idx, { url: e.target.value })} className="text-xs" />
                      </Field>
                      <Field label="Alt text" hint="Describe the photo for SEO & accessibility">
                        <Input value={img.alt} onChange={(e) => updateImage(idx, { alt: e.target.value })} />
                      </Field>
                      <Field label="Caption">
                        <Input value={img.caption} onChange={(e) => updateImage(idx, { caption: e.target.value })} />
                      </Field>
                      <Field label="Order">
                        <Input type="number" value={img.displayOrder} onChange={(e) => updateImage(idx, { displayOrder: Number(e.target.value) || 0 })} className="w-24" />
                      </Field>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                        <input
                          type="radio"
                          name="featured-image"
                          checked={img.isFeatured}
                          onChange={() => setFeaturedImage(idx)}
                          className="accent-[var(--primary)]"
                          aria-label={`Set image ${idx + 1} as featured`}
                        />
                        Featured
                      </label>
                      <div className="flex gap-0.5">
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveImage(idx, -1)} aria-label="Move image up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={idx === form.images.length - 1} onClick={() => moveImage(idx, 1)} aria-label="Move image down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeImage(idx)} aria-label="Remove image">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <MediaPickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            title="Add a product image"
            onSelect={(pick) => addImage(pick.url, pick.alt)}
          />
        </TabsContent>

        {/* -------- Specifications -------- */}
        <TabsContent value="specs" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Size" hint="e.g. 12 × 8 inches">
              <Input value={form.size} onChange={(e) => set("size", e.target.value)} />
            </Field>
            <Field label="Material" hint="e.g. Epoxy resin, MDF base">
              <Input value={form.material} onChange={(e) => set("material", e.target.value)} />
            </Field>
            <Field label="Colour">
              <Input value={form.colour} onChange={(e) => set("colour", e.target.value)} />
            </Field>
            <Field label="Occasion" hint="e.g. Housewarming, Anniversary">
              <Input value={form.occasion} onChange={(e) => set("occasion", e.target.value)} />
            </Field>
            <Field label="Care instructions">
              <Textarea rows={3} value={form.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} placeholder="Wipe with a soft dry cloth. Keep away from direct sunlight." />
            </Field>
          </div>
        </TabsContent>

        {/* -------- SEO -------- */}
        <TabsContent value="seo" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">How this product appears on Google and social shares.</p>
            <Button type="button" variant="outline" size="sm" onClick={generateSeoDefaults}>
              ✨ Generate defaults
            </Button>
          </div>
          <GooglePreview
            title={form.seoTitle || form.name || "Product title"}
            url={`artisticbykhushi.com/product/${form.slug || "your-slug"}`}
            description={form.metaDescription || form.shortDescription}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="SEO title" counter={<CharCount text={form.seoTitle} target={60} />}>
              <Input value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </Field>
            <Field label="Focus keyword" hint="Main search phrase this page should rank for">
              <Input value={form.focusKeyword} onChange={(e) => set("focusKeyword", e.target.value)} placeholder="resin nameplate" />
            </Field>
          </div>
          <Field label="Meta description" counter={<CharCount text={form.metaDescription} target={160} />}>
            <Textarea rows={2} value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
          </Field>
          <Field label="Secondary keywords" hint="Comma separated">
            <Input value={form.secondaryKeywords} onChange={(e) => set("secondaryKeywords", e.target.value)} placeholder="custom nameplate, personalized door sign" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="OG title" hint="Title when shared on WhatsApp / Facebook">
              <Input value={form.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />
            </Field>
            <Field label="Canonical URL" hint="Leave empty unless this page lives at another URL">
              <Input value={form.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://…" />
            </Field>
          </div>
          <Field label="OG description">
            <Textarea rows={2} value={form.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} />
          </Field>
        </TabsContent>

        {/* -------- FAQs -------- */}
        <TabsContent value="faqs" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Questions shown on this product page. Saved together with the product.</p>
          {form.faqs.length === 0 ? (
            <EmptyState title="No product FAQs" hint="Add answers buyers usually ask — shipping time, personalisation, care." />
          ) : null}
          {form.faqs.map((faq, idx) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Field label={`Question ${idx + 1}`} className="flex-1" error={submitted && !faq.question.trim() ? "Question is required" : undefined}>
                  <Input value={faq.question} onChange={(e) => updateFaqRow(idx, { question: e.target.value })} placeholder="How long does it take to make?" />
                </Field>
                <Button type="button" variant="ghost" size="icon" className="mt-6 text-destructive" onClick={() => removeFaqRow(idx)} aria-label="Remove FAQ">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Field label="Answer" error={submitted && !faq.answer.trim() ? "Answer is required" : undefined}>
                <Textarea rows={2} value={faq.answer} onChange={(e) => updateFaqRow(idx, { answer: e.target.value })} placeholder="Each piece is made to order and takes 5–7 days…" />
              </Field>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addFaqRow}>
            <Plus className="mr-1 h-4 w-4" /> Add FAQ
          </Button>
          {productFaqList.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {productFaqList.length} FAQ{productFaqList.length === 1 ? "" : "s"} currently live on this product page.
            </p>
          ) : null}
        </TabsContent>

        {/* -------- Publish -------- */}
        <TabsContent value="publish" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Published</p>
                  <p className="text-xs text-muted-foreground">Visible on the public website.</p>
                </div>
                <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} aria-label="Toggle published" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Featured</p>
                  <p className="text-xs text-muted-foreground">Highlighted on the homepage & listings.</p>
                </div>
                <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} aria-label="Toggle featured" />
              </div>
              <Field label="Display order" hint="Lower numbers appear first in listings.">
                <Input type="number" value={form.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value) || 0)} className="w-28" />
              </Field>
            </CardContent>
          </Card>

          <Field label="Related products" hint="Shown in “You may also like” on the product page.">
            <div className="rounded-lg border">
              <div className="border-b p-2">
                <Input value={relatedQ} onChange={(e) => setRelatedQ(e.target.value)} placeholder="Filter products…" className="h-8" />
              </div>
              <div className="max-h-64 overflow-y-auto custom-scroll p-2 space-y-1">
                {relatedOptions.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">No products to relate.</p>
                ) : (
                  relatedOptions.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary">
                      <Checkbox
                        checked={form.relatedProductIds.includes(p.id)}
                        onCheckedChange={(checked) =>
                          set(
                            "relatedProductIds",
                            checked
                              ? [...form.relatedProductIds, p.id]
                              : form.relatedProductIds.filter((rid) => rid !== p.id),
                          )
                        }
                      />
                      <ImageThumb src={p.featuredImageUrl} alt="" size={24} />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </Field>
        </TabsContent>
      </Tabs>

      {/* sticky save bar */}
      <div className="sticky bottom-16 z-20 mt-6 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {isNew ? "New product — not saved yet" : `Editing “${form.name}”`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
              {saving ? "Saving…" : "Save product"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function safeParseIds(raw: string): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
