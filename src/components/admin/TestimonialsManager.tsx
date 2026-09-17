"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { Testimonial } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Heart, MapPin, MessageSquareQuote, Pencil, Plus, Save, Search, Star, Trash2 } from "lucide-react";
import { useAdminTestimonials } from "./useAdminData";
import { PUBLIC_CACHE_KEYS } from "./useAdminData";
import { ConfirmDialog, EmptyState, Field, PublishedBadge, Spinner } from "./shared";
import { MediaPickField, type MediaPick } from "./media-picker";
import { errMsg } from "./admin-utils";

// ============================================================
// Testimonials module — customer love notes shown on the homepage.
// ============================================================

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className ?? ""}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < rating ? "fill-gold text-gold" : "text-border"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function TestimonialsManager({ createSignal }: { createSignal?: number }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "pending">("all");
  const { data: testimonials, isLoading } = useAdminTestimonials("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const listKey = ["admin", "testimonials", ""] as const;

  const [editing, setEditing] = useState<Testimonial | "new" | null>(createSignal ? "new" : null);
  const [toDelete, setToDelete] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pendingCount = (testimonials ?? []).filter((t) => !t.published).length;

  const filtered = (testimonials ?? []).filter((t) => {
    if (statusFilter === "published" && !t.published) return false;
    if (statusFilter === "pending" && t.published) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      t.name.toLowerCase().includes(needle) ||
      t.quote.toLowerCase().includes(needle) ||
      t.productName.toLowerCase().includes(needle) ||
      t.location.toLowerCase().includes(needle)
    );
  });

  function approve(t: Testimonial) {
    const prev = qc.getQueryData<Testimonial[]>(listKey);
    if (prev) qc.setQueryData(listKey, prev.map((x) => (x.id === t.id ? { ...x, published: true } : x)));
    api
      .put(`/api/admin/testimonials/${t.id}`, { published: true })
      .then(() => {
        toast({ title: "Review approved ♥", description: `${t.name}'s review is now live on the website.` });
        void qc.invalidateQueries({ queryKey: ["testimonials"] });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      })
      .catch((e) => {
        if (prev) qc.setQueryData(listKey, prev);
        toast({ title: "Approval failed", description: errMsg(e), variant: "destructive" });
      });
  }

  function togglePublished(t: Testimonial) {
    const prev = qc.getQueryData<Testimonial[]>(listKey);
    if (prev) qc.setQueryData(listKey, prev.map((x) => (x.id === t.id ? { ...x, published: !x.published } : x)));
    api
      .put(`/api/admin/testimonials/${t.id}`, { published: !t.published })
      .then(() => {
        toast({ title: !t.published ? "Testimonial visible" : "Testimonial hidden", description: t.name });
        void qc.invalidateQueries({ queryKey: ["testimonials"] });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      })
      .catch((e) => {
        if (prev) qc.setQueryData(listKey, prev);
        toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
      });
  }

  function toggleFeatured(t: Testimonial) {
    const prev = qc.getQueryData<Testimonial[]>(listKey);
    if (prev) qc.setQueryData(listKey, prev.map((x) => (x.id === t.id ? { ...x, featured: !x.featured } : x)));
    api
      .put(`/api/admin/testimonials/${t.id}`, { featured: !t.featured })
      .then(() => {
        toast({ title: !t.featured ? "Marked as featured ★" : "Removed from featured", description: t.name });
        void qc.invalidateQueries({ queryKey: ["testimonials"] });
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
      .delete(`/api/admin/testimonials/${toDelete.id}`)
      .then(() => {
        toast({ title: "Testimonial deleted", description: toDelete.name });
        setToDelete(null);
        void qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
        void qc.invalidateQueries({ queryKey: ["testimonials"] });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Customer love notes — homepage section, product pages &amp; the on-site review form. New reviews from
          visitors wait below until you approve them.
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1 h-4 w-4" /> Add Testimonial
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search testimonials…" className="pl-8" aria-label="Search testimonials" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1" role="tablist" aria-label="Filter by status">
          {([
            ["all", "All", (testimonials ?? []).length],
            ["published", "Live", (testimonials ?? []).length - pendingCount],
            ["pending", "Pending", pendingCount],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={statusFilter === key}
              onClick={() => setStatusFilter(key)}
              className={`flex min-h-8 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none tabular-nums ${
                  key === "pending" && count > 0 ? "bg-terracotta text-white" : "bg-border/60 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquareQuote className="h-8 w-8 text-muted-foreground/50" />}
          title="No testimonials yet"
          hint="Paste what customers WhatsApp you — names, cities and star ratings build instant trust."
        />
      ) : (
        <>
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-1/3">Customer</TableHead>
                  <TableHead>Quote</TableHead>
                  <TableHead className="w-28 text-center">Rating</TableHead>
                  <TableHead className="w-24 text-center">Featured</TableHead>
                  <TableHead className="w-20">Visible</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className={t.published ? "" : "bg-gold-soft/20"}>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => setEditing(t)}>
                        <p className="font-medium hover:text-primary">{t.name}</p>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          {t.location ? (
                            <>
                              <MapPin className="size-3" aria-hidden="true" />
                              {t.location}
                            </>
                          ) : null}
                        </p>
                        {t.source === "public" ? (
                          <Badge variant="outline" className="mt-1 w-fit border-terracotta/40 bg-terracotta/10 text-[9px] text-terracotta-deep">
                            From website form
                          </Badge>
                        ) : null}
                      </button>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 text-sm text-muted-foreground">“{t.quote}”</p>
                      {t.productName ? (
                        <Badge variant="outline" className="mt-1 w-fit text-[10px]">{t.productName}</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center">
                      <Stars rating={t.rating} className="justify-center" />
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(t)}
                        aria-pressed={t.featured}
                        aria-label={t.featured ? `Remove ${t.name} from featured` : `Mark ${t.name} as featured`}
                        className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-secondary"
                      >
                        <Heart className={`size-4 ${t.featured ? "fill-terracotta text-terracotta" : "text-muted-foreground"}`} aria-hidden="true" />
                      </button>
                    </TableCell>
                    <TableCell>
                      {t.published ? (
                        <Switch checked onCheckedChange={() => togglePublished(t)} aria-label={`Toggle visible for ${t.name}`} />
                      ) : (
                        <Button size="sm" className="h-8 rounded-full bg-terracotta px-3 text-xs hover:bg-terracotta-deep" onClick={() => approve(t)}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(t)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(t)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {filtered.map((t) => (
              <Card key={t.id} className={t.published ? "" : "border-gold/50 bg-gold-soft/20"}>
                <CardContent className="space-y-1.5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => setEditing(t)} className="text-left">
                      <p className="font-medium">{t.name}</p>
                      {t.location ? <p className="text-[11px] text-muted-foreground">{t.location}</p> : null}
                      {t.source === "public" ? (
                        <Badge variant="outline" className="mt-1 w-fit border-terracotta/40 bg-terracotta/10 text-[9px] text-terracotta-deep">
                          From website form
                        </Badge>
                      ) : null}
                    </button>
                    <PublishedBadge published={t.published} />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">“{t.quote}”</p>
                  <div className="flex items-center gap-2">
                    <Stars rating={t.rating} />
                    <span className="flex-1" />
                    {t.published ? null : (
                      <Button size="sm" className="h-7 rounded-full bg-terracotta px-2.5 text-[11px] hover:bg-terracotta-deep" onClick={() => approve(t)}>
                        <CheckCircle2 className="mr-0.5 h-3 w-3" /> Approve
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleFeatured(t)}
                      aria-label="Toggle featured"
                      className="inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-secondary"
                    >
                      <Heart className={`size-3.5 ${t.featured ? "fill-terracotta text-terracotta" : "text-muted-foreground"}`} aria-hidden="true" />
                    </button>
                    <Switch checked={t.published} onCheckedChange={() => togglePublished(t)} aria-label="Toggle visible" />
                    <Button variant="outline" size="icon" className="h-7 w-7 text-destructive" onClick={() => setToDelete(t)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {editing !== null ? (
        <TestimonialFormDialog testimonial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this testimonial?"
        description={`“${toDelete?.name ?? ""}” will be removed from the homepage section.`}
        confirmLabel="Delete Testimonial"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}

// ============================================================
// Testimonial form dialog
// ============================================================

function TestimonialFormDialog({ testimonial, onClose }: { testimonial: Testimonial | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState(5);
  const [quote, setQuote] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const initRef = useRef(false);

  useEffect(() => {
    if (testimonial && !initRef.current) {
      initRef.current = true;
      setName(testimonial.name);
      setLocation(testimonial.location);
      setRating(testimonial.rating);
      setQuote(testimonial.quote);
      setAvatarUrl(testimonial.avatarUrl);
      setProductName(testimonial.productName);
      setFeatured(testimonial.featured);
      setPublished(testimonial.published);
      setDisplayOrder(testimonial.displayOrder);
    }
    if (!testimonial) initRef.current = true;
  }, [testimonial]);

  async function save() {
    setSubmitted(true);
    if (!name.trim() || !quote.trim()) {
      toast({ title: "Name and quote are both required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      location: location.trim(),
      rating,
      quote: quote.trim(),
      avatarUrl,
      productName: productName.trim(),
      featured,
      published,
      displayOrder,
    };
    try {
      if (testimonial) {
        await api.put(`/api/admin/testimonials/${testimonial.id}`, body);
      } else {
        await api.post("/api/admin/testimonials", body);
      }
      toast({ title: "Testimonial saved", description: name });
      void qc.invalidateQueries({ queryKey: ["admin", "testimonials"] });
      void qc.invalidateQueries({ queryKey: ["testimonials"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle className="font-display">{testimonial ? "Edit Testimonial" : "New Testimonial"}</DialogTitle>
          <DialogDescription>Customer love notes appear in the homepage “Words from Happy Hearts” section.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" required error={submitted && !name.trim() ? "Name is required" : undefined}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" aria-required />
            </Field>
            <Field label="City / location" hint="Optional — adds authenticity.">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Surat, Gujarat" />
            </Field>
          </div>

          <Field label="Star rating">
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Star className={`size-6 ${n <= rating ? "fill-gold text-gold" : "text-border"}`} aria-hidden="true" />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">{rating} of 5</span>
            </div>
          </Field>

          <Field label="Their words" required error={submitted && !quote.trim() ? "Quote is required" : undefined} hint="Copy from WhatsApp / Instagram DMs — keep it in their voice.">
            <Textarea rows={4} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="“The nameplate arrived beautifully packed — my mother teared up seeing her name in gold!”" aria-required />
          </Field>

          <Field label="About which piece?" hint="Optional — shows a small chip under the quote.">
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Personalized Family Nameplate" />
          </Field>

          <Field label="Photo (optional)" hint="Customer photo or a shot of their piece — shows as a round avatar.">
            <MediaPickField
              value={avatarUrl}
              alt={`${name} avatar`}
              onPick={(pick: MediaPick) => setAvatarUrl(pick.url)}
              onClear={() => setAvatarUrl("")}
              size={56}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display order" hint="Lower shows first.">
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)} className="w-24" />
            </Field>
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Switch id="t-featured" checked={featured} onCheckedChange={setFeatured} />
                <label htmlFor="t-featured" className="text-sm">Featured ★ (first picks)</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="t-published" checked={published} onCheckedChange={setPublished} />
                <label htmlFor="t-published" className="text-sm">Visible on website</label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : "Save Testimonial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
