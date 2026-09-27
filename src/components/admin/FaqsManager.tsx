"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { Faq } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { useAdminBlogs, useAdminCategories, useAdminFaqs, useAdminPages, useAdminProducts } from "./useAdminData";
import { PUBLIC_CACHE_KEYS } from "./useAdminData";
import { ConfirmDialog, EmptyState, Field, PublishedBadge, Spinner } from "./shared";
import { errMsg } from "./admin-utils";

// ============================================================
// FAQs module — all scopes, with entity resolution.
// ============================================================

const SCOPES = ["", "GENERAL", "PRODUCT", "CATEGORY", "BLOG", "PAGE"] as const;
const SCOPE_LABELS: Record<string, string> = {
  "": "All",
  GENERAL: "General",
  PRODUCT: "Product",
  CATEGORY: "Category",
  BLOG: "Blog",
  PAGE: "Page",
};

export function FaqsManager({ createSignal }: { createSignal?: number }) {
  const [scope, setScope] = useState<string>("");
  const [q, setQ] = useState("");
  const { data: faqs, isLoading } = useAdminFaqs(scope);
  const { data: products } = useAdminProducts({ page: 1, pageSize: 200, q: "", category: "", status: "all" });
  const { data: categories } = useAdminCategories();
  const { data: blogs } = useAdminBlogs({ page: 1, pageSize: 200, q: "", status: "all" });
  const { data: pages } = useAdminPages();
  const qc = useQueryClient();
  const { toast } = useToast();
  const faqKey = ["admin", "faqs", scope] as const;

  const [editing, setEditing] = useState<Faq | "new" | null>(createSignal ? "new" : null);
  const [toDelete, setToDelete] = useState<Faq | null>(null);
  const [deleting, setDeleting] = useState(false);

  // id → display name for entity resolution
  const entityName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products?.items ?? []) map.set(p.id, p.name);
    for (const c of categories ?? []) map.set(c.id, c.name);
    for (const b of blogs?.items ?? []) map.set(b.id, b.title);
    for (const p of pages ?? []) map.set(p.id, p.title);
    return map;
  }, [products, categories, blogs, pages]);

  const filtered = useMemo(() => {
    const list = faqs ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((f) => f.question.toLowerCase().includes(needle) || f.answer.toLowerCase().includes(needle));
  }, [faqs, q]);

  function togglePublished(faq: Faq) {
    const prev = qc.getQueryData<Faq[]>(faqKey);
    if (prev) qc.setQueryData(faqKey, prev.map((f) => (f.id === faq.id ? { ...f, published: !f.published } : f)));
    api
      .put(`/api/admin/faqs/${faq.id}`, { published: !faq.published })
      .then(() => {
        toast({ title: !faq.published ? "FAQ visible" : "FAQ hidden", description: faq.question.slice(0, 60) });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => {
        if (prev) qc.setQueryData(faqKey, prev);
        toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
      });
  }

  function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    api
      .delete(`/api/admin/faqs/${toDelete.id}`)
      .then(() => {
        toast({ title: "FAQ deleted", description: toDelete.question.slice(0, 60) });
        setToDelete(null);
        void qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
        for (const key of PUBLIC_CACHE_KEYS) void qc.invalidateQueries({ queryKey: key });
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={scope} onValueChange={setScope}>
          <TabsList className="flex-wrap h-auto">
            {SCOPES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {SCOPE_LABELS[s]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1 h-4 w-4" /> Add FAQ
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…" className="pl-8" aria-label="Search FAQs" />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<HelpCircle className="h-8 w-8 text-muted-foreground/50" />} title="No FAQs found" hint="Answer common questions once — they appear across the site." />
      ) : (
        <>
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border md:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-1/3">Question</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead className="w-44">Scope</TableHead>
                  <TableHead className="w-20 text-center">Order</TableHead>
                  <TableHead className="w-20">Visible</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => setEditing(f)}>
                        <p className="line-clamp-1 font-medium hover:text-primary">{f.question}</p>
                      </button>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className="w-fit">{SCOPE_LABELS[f.entityType] ?? f.entityType}</Badge>
                        {f.entityId ? (
                          <span className="truncate text-[11px] text-muted-foreground">{entityName.get(f.entityId) ?? "— deleted item —"}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{f.displayOrder}</TableCell>
                    <TableCell>
                      <Switch checked={f.published} onCheckedChange={() => togglePublished(f)} aria-label={`Toggle visible for ${f.question}`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(f)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(f)} aria-label="Delete">
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
            {filtered.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => setEditing(f)} className="text-left font-medium">
                      {f.question}
                    </button>
                    <PublishedBadge published={f.published} />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{SCOPE_LABELS[f.entityType] ?? f.entityType}</Badge>
                    {f.entityId ? <span className="truncate text-[11px] text-muted-foreground">{entityName.get(f.entityId) ?? "—"}</span> : null}
                    <span className="flex-1" />
                    <Switch checked={f.published} onCheckedChange={() => togglePublished(f)} aria-label="Toggle visible" />
                    <Button variant="outline" size="icon" className="h-7 w-7 text-destructive" onClick={() => setToDelete(f)} aria-label="Delete">
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
        <FaqFormDialog
          faq={editing === "new" ? null : editing}
          entityName={entityName}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this FAQ?"
        description={`“${toDelete?.question ?? ""}” will be removed from the website.`}
        confirmLabel="Delete FAQ"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}

// ============================================================
// FAQ form dialog
// ============================================================

function FaqFormDialog({
  faq,
  entityName,
  onClose,
}: {
  faq: Faq | null;
  entityName: Map<string, string>;
  onClose: () => void;
}) {
  const { data: products } = useAdminProducts({ page: 1, pageSize: 200, q: "", category: "", status: "all" });
  const { data: categories } = useAdminCategories();
  const { data: blogs } = useAdminBlogs({ page: 1, pageSize: 200, q: "", status: "all" });
  const { data: pages } = useAdminPages();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [entityType, setEntityType] = useState("GENERAL");
  const [entityId, setEntityId] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [published, setPublished] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const initRef = useRef(false);

  useEffect(() => {
    if (faq && !initRef.current) {
      initRef.current = true;
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setEntityType(faq.entityType);
      setEntityId(faq.entityId ?? "");
      setDisplayOrder(faq.displayOrder);
      setPublished(faq.published);
    }
    if (!faq) initRef.current = true;
  }, [faq]);

  const entityOptions: { id: string; label: string }[] = useMemo(() => {
    switch (entityType) {
      case "PRODUCT":
        return (products?.items ?? []).map((p) => ({ id: p.id, label: p.name }));
      case "CATEGORY":
        return (categories ?? []).map((c) => ({ id: c.id, label: c.name }));
      case "BLOG":
        return (blogs?.items ?? []).map((b) => ({ id: b.id, label: b.title }));
      case "PAGE":
        return (pages ?? []).map((p) => ({ id: p.id, label: p.title }));
      default:
        return [];
    }
  }, [entityType, products, categories, blogs, pages]);

  async function save() {
    setSubmitted(true);
    if (!question.trim() || !answer.trim()) {
      toast({ title: "Question and answer are both required", variant: "destructive" });
      return;
    }
    if (entityType !== "GENERAL" && !entityId) {
      toast({ title: "Choose the item this FAQ belongs to", variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      question: question.trim(),
      answer: answer.trim(),
      entityType,
      entityId: entityType === "GENERAL" ? null : entityId,
      displayOrder,
      published,
    };
    try {
      if (faq) {
        await api.put(`/api/admin/faqs/${faq.id}`, body);
      } else {
        await api.post("/api/admin/faqs", body);
      }
      toast({ title: "FAQ saved", description: question.slice(0, 60) });
      void qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{faq ? "Edit FAQ" : "New FAQ"}</DialogTitle>
          <DialogDescription>Frequently asked questions appear on the site and inside product pages.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Question" required error={submitted && !question.trim() ? "Question is required" : undefined}>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="How long does a custom order take?" aria-required />
          </Field>
          <Field label="Answer" required error={submitted && !answer.trim() ? "Answer is required" : undefined}>
            <Textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Custom pieces take 5–7 days to craft plus shipping time…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Scope" hint="Where this FAQ appears.">
              <Select
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v);
                  setEntityId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General — whole site</SelectItem>
                  <SelectItem value="PRODUCT">A specific product</SelectItem>
                  <SelectItem value="CATEGORY">A specific category</SelectItem>
                  <SelectItem value="BLOG">A blog post</SelectItem>
                  <SelectItem value="PAGE">A page</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Display order">
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)} className="w-24" />
            </Field>
          </div>
          {entityType !== "GENERAL" ? (
            <Field
              label={SCOPE_LABELS[entityType]}
              required
              error={submitted && !entityId ? "Please choose an item" : undefined}
              hint={faq?.entityId && entityName.get(faq.entityId) ? `Currently: ${entityName.get(faq.entityId)}` : undefined}
            >
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose a ${SCOPE_LABELS[entityType].toLowerCase()}…`} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {entityOptions.length === 0 ? (
                    <SelectItem value="" disabled>
                      Loading…
                    </SelectItem>
                  ) : (
                    entityOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <div className="flex items-center gap-2">
            <Switch id="faq-published" checked={published} onCheckedChange={setPublished} />
            <label htmlFor="faq-published" className="text-sm">Visible on website</label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : "Save FAQ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
