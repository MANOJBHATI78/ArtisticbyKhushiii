"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { PageSchemaEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ExternalLink,
  FileJson2,
  HelpCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useAdminMe, useAdminPageSchemas } from "./useAdminData";
import { ConfirmDialog, EmptyState, Field, PublishedBadge, Spinner } from "./shared";
import { errMsg, timeAgo } from "./admin-utils";

// ============================================================
// Schema Manager — per-page JSON-LD structured data entries.
// Schema that Google reads for rich results (stars, business
// info, breadcrumbs). Rendered server-side on matching pages.
// ============================================================

const QUICK_PATHS: { path: string; label: string }[] = [
  { path: "/", label: "Home" },
  { path: "/products", label: "Products" },
  { path: "/product/*", label: "Every product page" },
  { path: "/blog/*", label: "Every blog post" },
  { path: "/*", label: "Whole site" },
];

const EXAMPLE_SCHEMA = `{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Artistic by Khushiii",
  "image": "https://artisticbykhushiii.com/images/logo.png",
  "telephone": "+91-83201-12554",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Surat",
    "addressRegion": "Gujarat",
    "addressCountry": "IN"
  },
  "priceRange": "₹₹"
}`;

/** Plain-language "where will this render" preview. */
function appliesTo(path: string): string {
  const p = (path || "/").trim();
  if (p === "/" || p === "/*") return "Will render on every page of the site.";
  if (p.endsWith("/*")) return `Will render on every page under ${p.slice(0, -1)}`;
  return `Will render only on ${p}.`;
}

/** "" = valid JSON object/array; otherwise a friendly error message. */
function validateJson(raw: string): string {
  const s = raw.trim();
  if (!s) return "Add some JSON — a { … } object or an array of them.";
  try {
    const parsed = JSON.parse(s);
    if (parsed === null || typeof parsed !== "object") {
      return "Schema must be a JSON object { … } or an array of objects [ { … } ].";
    }
    return "";
  } catch (e) {
    return e instanceof Error && e.message ? `Not valid JSON — ${e.message}` : "This is not valid JSON. Check for missing quotes, commas or brackets.";
  }
}

export function SchemaManager() {
  const { data: schemas, isLoading } = useAdminPageSchemas();
  const { data: me } = useAdminMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const listKey = ["admin", "schemas"] as const;
  const canEdit = me?.role === "OWNER" || me?.role === "ADMIN";

  const [editing, setEditing] = useState<PageSchemaEntry | "new" | null>(null);
  const [toDelete, setToDelete] = useState<PageSchemaEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  function toggleEnabled(s: PageSchemaEntry) {
    const prev = qc.getQueryData<PageSchemaEntry[]>(listKey);
    if (prev) qc.setQueryData(listKey, prev.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)));
    api
      .put(`/api/admin/page-schemas/${s.id}`, { enabled: !s.enabled })
      .then(() => {
        toast({ title: !s.enabled ? "Schema live" : "Schema paused", description: s.name });
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
      .delete(`/api/admin/page-schemas/${toDelete.id}`)
      .then(() => {
        toast({ title: "Schema deleted", description: toDelete.name });
        setToDelete(null);
        void qc.invalidateQueries({ queryKey: ["admin", "schemas"] });
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Extra JSON-LD structured data for specific pages — what Google reads for rich results (business info,
          breadcrumbs, offers). The site already adds product, article and FAQ schema automatically.
        </p>
        {canEdit ? (
          <Button onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> Add schema
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : (schemas ?? []).length === 0 ? (
        <EmptyState
          icon={<FileJson2 className="h-8 w-8 text-muted-foreground/50" />}
          title="No custom schema yet"
          hint={
            canEdit
              ? "Add structured data like LocalBusiness info so Google can show rich results about the studio."
              : "Ask an owner or admin to add structured data here."
          }
          action={
            canEdit ? (
              <Button className="mt-2" onClick={() => setEditing("new")}>
                <Plus className="mr-1 h-4 w-4" /> Add schema
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
                  <TableHead className="w-2/5">Schema</TableHead>
                  <TableHead className="w-32">Page path</TableHead>
                  <TableHead className="w-40">JSON</TableHead>
                  <TableHead className="w-20">Live</TableHead>
                  <TableHead className="w-24">Updated</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(schemas ?? []).map((s) => (
                  <TableRow key={s.id} className={s.enabled ? "" : "opacity-60"}>
                    <TableCell>
                      <button type="button" className="text-left" onClick={() => canEdit && setEditing(s)}>
                        <p className="font-medium hover:text-primary">{s.name}</p>
                        <p className="text-xs text-muted-foreground">order {s.displayOrder}</p>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {s.path}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {validateJson(s.schemaJson) ? (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive">
                          invalid JSON
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> valid
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Switch checked={s.enabled} onCheckedChange={() => toggleEnabled(s)} aria-label={`Toggle live for ${s.name}`} />
                      ) : (
                        <PublishedBadge published={s.enabled} />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(s.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(s)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(s)} aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">view-only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {(schemas ?? []).map((s) => (
              <Card key={s.id} className={s.enabled ? "" : "opacity-70"}>
                <CardContent className="space-y-1.5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="min-w-0 text-left" onClick={() => canEdit && setEditing(s)}>
                      <p className="font-medium">{s.name}</p>
                      <Badge variant="secondary" className="mt-0.5 font-mono text-[11px]">
                        {s.path}
                      </Badge>
                    </button>
                    <PublishedBadge published={s.enabled} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {validateJson(s.schemaJson) ? "⚠ JSON needs fixing" : "Valid JSON"} · updated {timeAgo(s.updatedAt)}
                  </p>
                  {canEdit ? (
                    <div className="flex items-center gap-1">
                      <Switch checked={s.enabled} onCheckedChange={() => toggleEnabled(s)} aria-label={`Toggle live for ${s.name}`} />
                      <span className="text-[11px] text-muted-foreground">{s.enabled ? "Live" : "Paused"}</span>
                      <span className="flex-1" />
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setEditing(s)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setToDelete(s)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {editing !== null ? (
        <SchemaFormDialog schema={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this schema?"
        description={`“${toDelete?.name ?? ""}” will stop rendering on ${toDelete?.path ?? ""}. The rest of the site's automatic schema is not affected.`}
        confirmLabel="Delete schema"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}

// ============================================================
// Schema form dialog
// ============================================================

function SchemaFormDialog({ schema, onClose }: { schema: PageSchemaEntry | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("/");
  const [schemaJson, setSchemaJson] = useState(EXAMPLE_SCHEMA);
  const [enabled, setEnabled] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const initRef = useRef(false);

  useEffect(() => {
    if (schema && !initRef.current) {
      initRef.current = true;
      setName(schema.name);
      setPath(schema.path);
      setSchemaJson(schema.schemaJson);
      setEnabled(schema.enabled);
      setDisplayOrder(schema.displayOrder);
    }
    if (!schema) initRef.current = true;
  }, [schema]);

  // live validation (green/red feedback under the textarea)
  const jsonError = useMemo(() => validateJson(schemaJson), [schemaJson]);

  async function save() {
    setSubmitted(true);
    if (!name.trim() || jsonError) {
      if (jsonError) toast({ title: "The JSON isn't valid", description: jsonError, variant: "destructive" });
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      path,
      schemaJson: schemaJson.trim(),
      enabled,
      displayOrder,
    };
    try {
      if (schema) {
        await api.put(`/api/admin/page-schemas/${schema.id}`, body);
      } else {
        await api.post("/api/admin/page-schemas", body);
      }
      toast({ title: "Schema saved", description: `${name.trim()} — ${path}` });
      void qc.invalidateQueries({ queryKey: ["admin", "schemas"] });
      onClose();
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle className="font-display">{schema ? "Edit schema" : "New schema"}</DialogTitle>
          <DialogDescription>
            JSON-LD structured data for a page (or a group of pages). Google reads it to understand the studio better.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={submitted && !name.trim() ? "Give this schema a name." : undefined} hint="Just for you — e.g. “Local business info”.">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Local business info" aria-required />
            </Field>
            <Field label="Display order" hint="Lower shows first when several schemas match a page.">
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)} className="w-24" />
            </Field>
          </div>

          <Field label="Page path" hint={appliesTo(path)}>
            <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/" className="font-mono" aria-label="Page path" />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_PATHS.map((qp) => (
                <button
                  key={qp.path}
                  type="button"
                  onClick={() => setPath(qp.path)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:bg-secondary ${
                    path === qp.path ? "border-primary/40 bg-primary/10 font-medium text-primary" : "text-muted-foreground"
                  }`}
                  aria-pressed={path === qp.path}
                >
                  {qp.label} <span className="font-mono opacity-70">{qp.path}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="JSON-LD"
            required
            error={submitted && jsonError ? jsonError : undefined}
            hint='One { … } object, or an array like [ { … }, { … } ]. Copy examples from Google or schema.org.'
          >
            <Textarea
              rows={10}
              value={schemaJson}
              onChange={(e) => setSchemaJson(e.target.value)}
              className="font-mono text-xs leading-relaxed"
              spellCheck={false}
              aria-required
            />
            {schemaJson.trim() ? (
              jsonError ? (
                <p className="text-xs font-medium text-destructive">✗ {jsonError}</p>
              ) : (
                <p className="text-xs font-medium text-green-700">✓ Valid JSON</p>
              )
            ) : null}
          </Field>

          <div className="flex items-center gap-2">
            <Switch id="schema-enabled" checked={enabled} onCheckedChange={setEnabled} />
            <label htmlFor="schema-enabled" className="text-sm">
              Live {enabled ? "— renders on the site now" : "— paused (saved but not rendered)"}
            </label>
          </div>

          {/* ---- helper (collapsible) ---- */}
          <details className="group rounded-lg border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground marker:content-none">
              <HelpCircle className="mr-1 inline size-3.5 text-primary" />
              What is JSON-LD? How do I use this? (help + example)
              <span className="ml-1 text-muted-foreground/70 group-open:hidden">&#9662;</span>
              <span className="ml-1 hidden text-muted-foreground/70 group-open:inline">&#9652;</span>
            </summary>
            <div className="mt-2.5 space-y-2 leading-relaxed">
              <p>
                JSON-LD is a little label about your business written in a format Google understands. When Google reads
                it, it can show <em>rich results</em> — your business info, review stars, breadcrumbs — right in search.
                The site already adds product, blog and FAQ schema automatically; add anything extra here (e.g. a{" "}
                <code className="rounded bg-muted px-1">LocalBusiness</code> block for the whole site).
              </p>
              <p className="font-medium text-foreground">Copy-paste example (LocalBusiness):</p>
              <pre className="custom-scroll overflow-x-auto rounded-lg border bg-card p-3 font-mono text-[11px] leading-relaxed">{EXAMPLE_SCHEMA}</pre>
              <p>Test your JSON before saving:</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  Google Rich Results Test <ExternalLink className="h-3 w-3" />
                </a>
                <a href="https://validator.schema.org" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  validator.schema.org <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : "Save schema"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
