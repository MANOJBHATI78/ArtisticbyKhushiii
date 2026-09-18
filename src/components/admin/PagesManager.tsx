"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, FileText, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useAdminPages, type AdminPage } from "./useAdminData";
import { PUBLIC_CACHE_KEYS } from "./useAdminData";
import { CharCount, ConfirmDialog, EmptyState, Field, GooglePreview, PublishedBadge, SlugInput, Spinner } from "./shared";
import { RichTextEditor } from "./rich-text-editor";
import { errMsg } from "./admin-utils";

// ============================================================
// Static pages module (about, privacy, terms…)
// ============================================================

export function PagesManager({ createSignal }: { createSignal?: number }) {
  const { data: pages, isLoading } = useAdminPages();
  const qc = useQueryClient();
  const { toast } = useToast();
  const pagesKey = ["admin", "pages"] as const;

  const [editing, setEditing] = useState<AdminPage | "new" | null>(createSignal ? "new" : null);
  const [toDelete, setToDelete] = useState<AdminPage | null>(null);
  const [deleting, setDeleting] = useState(false);

  function togglePublished(page: AdminPage) {
    const prev = qc.getQueryData<AdminPage[]>(pagesKey);
    if (prev) qc.setQueryData(pagesKey, prev.map((p) => (p.id === page.id ? { ...p, published: !p.published } : p)));
    api
      .put(`/api/admin/pages/${page.id}`, { published: !page.published })
      .then(() => {
        toast({ title: !page.published ? "Page published" : "Page hidden", description: page.title });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => {
        if (prev) qc.setQueryData(pagesKey, prev);
        toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
      });
  }

  function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    api
      .delete(`/api/admin/pages/${toDelete.id}`)
      .then(() => {
        toast({ title: "Page deleted", description: toDelete.title });
        setToDelete(null);
        void qc.invalidateQueries({ queryKey: pagesKey });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  const list = pages ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">About, Services, Privacy policy, Terms and other static pages.</p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1 h-4 w-4" /> Add Page
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<FileText className="h-8 w-8 text-muted-foreground/50" />} title="No pages yet" />
      ) : (
        <>
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-40">URL</TableHead>
                  <TableHead className="w-24">Published</TableHead>
                  <TableHead className="w-24 text-center">Order</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => setEditing(p)}>
                        <p className="font-medium hover:text-primary">{p.title}</p>
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">/page/{p.slug}</TableCell>
                    <TableCell>
                      <Switch checked={p.published} onCheckedChange={() => togglePublished(p)} aria-label={`Toggle published for ${p.title}`} />
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{p.displayOrder ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <a href={`/page/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary" title="Preview" aria-label={`Preview ${p.title}`}>
                          <Eye className="h-4 w-4" />
                        </a>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(p)} aria-label="Delete">
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
            {list.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => setEditing(p)} className="truncate font-medium">
                        {p.title}
                      </button>
                      <PublishedBadge published={p.published} />
                    </div>
                    <p className="text-xs text-muted-foreground">/page/{p.slug}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Switch checked={p.published} onCheckedChange={() => togglePublished(p)} aria-label="Toggle published" />
                      <span className="text-[11px] text-muted-foreground">{p.published ? "Published" : "Hidden"}</span>
                      <span className="flex-1" />
                      <a href={`/page/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded-md border" aria-label="Preview">
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      <Button variant="outline" size="icon" className="h-7 w-7 text-destructive" onClick={() => setToDelete(p)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {editing !== null ? <PageFormDialog page={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.title ?? ""}”?`}
        description="This permanently removes the page from the website (any links to it will stop working)."
        confirmLabel="Delete page"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}

// ============================================================
// Page form dialog
// ============================================================

function PageFormDialog({ page, onClose }: { page: AdminPage | null; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [published, setPublished] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const initRef = useRef(false);

  useEffect(() => {
    if (page && !initRef.current) {
      initRef.current = true;
      setTitle(page.title);
      setSlug(page.slug);
      setContent(page.content);
      setSeoTitle(page.seoTitle);
      setMetaDescription(page.metaDescription);
      setPublished(page.published);
      setDisplayOrder(page.displayOrder ?? 0);
    }
    if (!page) initRef.current = true;
  }, [page]);

  async function save() {
    setSubmitted(true);
    if (!title.trim()) {
      toast({ title: "Page title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = { title: title.trim(), slug, content, seoTitle, metaDescription, published, displayOrder };
    try {
      if (page) {
        await api.put(`/api/admin/pages/${page.id}`, body);
      } else {
        await api.post("/api/admin/pages", body);
      }
      toast({ title: "Page saved", description: title });
      void qc.invalidateQueries({ queryKey: ["admin", "pages"] });
      for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle className="font-display">{page ? `Edit page: ${page.title}` : "New page"}</DialogTitle>
          <DialogDescription>Static content pages linked from menus and the footer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required error={submitted && !title.trim() ? "Title is required" : undefined}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-required />
            </Field>
            <Field label="Display order">
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)} className="w-28" />
            </Field>
          </div>
          <SlugInput value={slug} onChange={setSlug} from={title} />
          <Field label="Content">
            <RichTextEditor value={content} onChange={setContent} rows={12} variant="full" />
          </Field>
          <GooglePreview
            title={seoTitle || title || "Page title"}
            url={`artisticbykhushi.com/page/${slug || "your-slug"}`}
            description={metaDescription}
          />
          <Field label="SEO title" counter={<CharCount text={seoTitle} target={60} />}>
            <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </Field>
          <Field label="Meta description" counter={<CharCount text={metaDescription} target={160} />}>
            <Textarea rows={2} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
          </Field>
          <div className="flex items-center gap-2">
            <Switch id="page-published" checked={published} onCheckedChange={setPublished} />
            <label htmlFor="page-published" className="text-sm">Published</label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : "Save page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
