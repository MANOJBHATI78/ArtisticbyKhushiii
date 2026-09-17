"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isSameMonth, parseISO } from "date-fns";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { LEAD_STATUSES, type Lead, type Paginated } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCheck,
  CloudOff,
  Copy,
  Download,
  Inbox,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useAdminDashboard, useAdminLeads } from "./useAdminData";
import { useSettings } from "@/lib/queries";
import { ConfirmDialog, EmptyState, LeadStatusBadge } from "./shared";
import { buildCsv, downloadCsv, errMsg, fmtDate, leadStatusColor, timeAgo, useDebounced } from "./admin-utils";

// ============================================================
// Leads / inquiries module
// ============================================================

export function LeadsManager({ jump }: { jump?: { q: string; n: number } }) {
  const [q, setQ] = useState(jump?.q ?? "");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const debouncedQ = useDebounced(q);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [detail, setDetail] = useState<Lead | null>(null);
  const [toDelete, setToDelete] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const params = { page, pageSize, q: debouncedQ, status };
  const { data, isLoading } = useAdminLeads(params);
  const { data: stats } = useAdminDashboard();
  // converted-this-month (server caps pageSize at 100 per request)
  const { data: convertedAll } = useAdminLeads({ page: 1, pageSize: 100, q: "", status: "CONVERTED" });
  const convertedThisMonth = useMemo(() => {
    const now = new Date();
    return (convertedAll?.items ?? []).filter((l) => {
      try {
        return isSameMonth(parseISO(l.createdAt), now);
      } catch {
        return false;
      }
    }).length;
  }, [convertedAll]);

  const leadsKey = ["admin", "leads", page, pageSize, debouncedQ, status] as const;

  function updateLeadLocal(id: string, patch: Partial<Lead>) {
    const prev = qc.getQueryData<Paginated<Lead>>(leadsKey);
    if (prev) {
      qc.setQueryData(leadsKey, { ...prev, items: prev.items.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
    }
    if (detail?.id === id) setDetail((d) => (d ? { ...d, ...patch } : d));
    return prev;
  }

  function setStatusOf(lead: Lead, newStatus: string) {
    const prev = updateLeadLocal(lead.id, { status: newStatus });
    api
      .put(`/api/admin/leads/${lead.id}`, { status: newStatus })
      .then(() => {
        toast({ title: `Marked as ${newStatus.replace("_", " ")}`, description: lead.name });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        void qc.invalidateQueries({ queryKey: ["admin", "lead-stats"] });
      })
      .catch((e) => {
        if (prev) qc.setQueryData(leadsKey, prev);
        toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
      });
  }

  function saveNotes(lead: Lead, notes: string) {
    const prev = updateLeadLocal(lead.id, { notes });
    api
      .put(`/api/admin/leads/${lead.id}`, { notes })
      .then(() => toast({ title: "Notes saved", description: lead.name }))
      .catch((e) => {
        if (prev) qc.setQueryData(leadsKey, prev);
        toast({ title: "Could not save notes", description: errMsg(e), variant: "destructive" });
      });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      // the server caps pageSize at 100 — fetch every page until we have all
      const PAGE = 100;
      const collected: Lead[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await api.get<Paginated<Lead>>(
          `/api/admin/leads?page=${page}&pageSize=${PAGE}${debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ""}${status ? `&status=${status}` : ""}`,
        );
        collected.push(...res.items);
        totalPages = res.totalPages;
        page += 1;
      } while (page <= totalPages);
      const csv = buildCsv(
        ["Name", "Mobile", "City", "Product", "Product URL", "Category", "Message", "Preferred contact", "Source page", "UTM source", "UTM medium", "UTM campaign", "Referrer", "Status", "Notes", "Google Sheet synced", "Created at"],
        collected.map((l) => [
          l.name, l.mobile, l.city, l.product, l.productUrl, l.category, l.message, l.preferredContact, l.sourcePage,
          l.utmSource, l.utmMedium, l.utmCampaign, l.referrer, l.status, l.notes, l.sheetSynced ? "yes" : "no", l.createdAt,
        ]),
      );
      downloadCsv("artistic-by-khushi-leads.csv", csv);
      toast({ title: "CSV exported", description: `${collected.length} inquiries downloaded.` });
    } catch (e) {
      toast({ title: "Export failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    api
      .delete(`/api/admin/leads/${toDelete.id}`)
      .then(() => {
        toast({ title: "Inquiry deleted", description: toDelete.name });
        setToDelete(null);
        setDetail(null);
        void qc.invalidateQueries({ queryKey: ["admin", "leads"] });
        void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        void qc.invalidateQueries({ queryKey: ["admin", "lead-stats"] });
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  const items = data?.items ?? [];
  const statCards = [
    { label: "Total inquiries", value: stats?.totalLeads ?? 0, icon: Inbox, tint: "bg-primary/10 text-primary" },
    { label: "New (need action)", value: stats?.newLeads ?? 0, icon: MessageCircle, tint: "bg-gold-soft text-espresso" },
    { label: "Converted", value: stats?.convertedLeads ?? 0, icon: CheckCheck, tint: "bg-green-100 text-green-800" },
    { label: "Converted this month", value: convertedThisMonth, icon: CheckCheck, tint: "bg-terracotta/15 text-terracotta-deep" },
  ];

  return (
    <div className="space-y-4">
      {/* stat mini cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.tint}`}>
                  <Icon className="h-4 w-4" style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <p className="font-display text-xl font-semibold leading-none">{c.value}</p>
                  <p className="text-[11px] text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, mobile or product…" className="pl-8" aria-label="Search leads" />
        </div>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox className="h-8 w-8 text-muted-foreground/50" />} title="No inquiries found" hint="Every enquiry from the website contact forms lands here." />
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden max-h-[70vh] overflow-auto custom-scroll rounded-lg border lg:block">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="min-w-52">Product / message</TableHead>
                  <TableHead className="w-36">Status</TableHead>
                  <TableHead className="w-24">Notes</TableHead>
                  <TableHead className="w-20">Sheet</TableHead>
                  <TableHead className="w-28">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetail(l)}>
                    <TableCell>
                      <p className="font-medium">{l.name}</p>
                      <a href={`tel:${l.mobile}`} className="text-xs text-muted-foreground hover:text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {l.mobile}
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                        {l.city ? <><MapPin className="h-3 w-3" /> {l.city}</> : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {l.product ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="secondary" className="max-w-40 truncate">{l.product}</Badge>
                          {l.sourcePage ? (
                            <a href={l.sourcePage.startsWith("#") ? l.sourcePage : `#${l.sourcePage}`} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline" onClick={(e) => e.stopPropagation()}>
                              source page
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                      {l.message ? <p className="mt-0.5 line-clamp-2 max-w-96 text-xs text-muted-foreground">{l.message}</p> : null}
                      {l.utmSource || l.utmMedium || l.utmCampaign ? (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {l.utmSource ? <Badge variant="outline" className="text-[10px]">src: {l.utmSource}</Badge> : null}
                          {l.utmMedium ? <Badge variant="outline" className="text-[10px]">med: {l.utmMedium}</Badge> : null}
                          {l.utmCampaign ? <Badge variant="outline" className="text-[10px]">cmp: {l.utmCampaign}</Badge> : null}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={l.status} onValueChange={(v) => setStatusOf(l, v)}>
                        <SelectTrigger className={`h-8 w-32 border text-xs font-medium ${leadStatusColor(l.status)}`} aria-label={`Status for ${l.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <NotesPopover lead={l} onSave={saveNotes} />
                    </TableCell>
                    <TableCell>
                      {l.sheetSynced ? (
                        <span title="Synced to Google Sheets" className="inline-flex items-center gap-1 text-xs text-green-700">
                          <CheckCheck className="h-3.5 w-3.5" /> synced
                        </span>
                      ) : (
                        <span title="Not synced to Google Sheets (local only)" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CloudOff className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground">{timeAgo(l.createdAt)}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* mobile / tablet cards */}
          <div className="space-y-2 lg:hidden">
            {items.map((l) => (
              <Card key={l.id} role="button" tabIndex={0} onClick={() => setDetail(l)} onKeyDown={(e) => e.key === "Enter" && setDetail(l)} className="cursor-pointer">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.mobile}{l.city ? ` · ${l.city}` : ""}</p>
                    </div>
                    <LeadStatusBadge status={l.status} />
                  </div>
                  {l.product ? <Badge variant="secondary" className="max-w-full truncate">{l.product}</Badge> : null}
                  {l.message ? <p className="line-clamp-2 text-xs text-muted-foreground">{l.message}</p> : null}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{timeAgo(l.createdAt)}</span>
                    {l.sheetSynced ? <CheckCheck className="h-3 w-3 text-green-700" /> : <CloudOff className="h-3 w-3" />}
                    <span className="flex-1" />
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select value={l.status} onValueChange={(v) => setStatusOf(l, v)}>
                      <SelectTrigger className={`h-8 border text-xs font-medium ${leadStatusColor(l.status)}`} aria-label={`Status for ${l.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {data?.total ?? items.length} inquiries · page {data?.page ?? 1} of {data?.totalPages ?? 1}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={(data?.page ?? 1) <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* detail sheet */}
      {detail ? <LeadDetailSheet lead={detail} onClose={() => setDetail(null)} onStatus={setStatusOf} onNotes={saveNotes} onDelete={() => setToDelete(detail)} /> : null}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete inquiry from “${toDelete?.name ?? ""}”?`}
        description="The inquiry and its notes will be permanently removed. Google Sheets rows already synced are not affected."
        confirmLabel="Delete inquiry"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}

// ============================================================
// Notes popover (inline)
// ============================================================

function NotesPopover({ lead, onSave }: { lead: Lead; onSave: (lead: Lead, notes: string) => void }) {
  const [notes, setNotes] = useState(lead.notes);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Notes for ${lead.name}`} title={lead.notes || "Add notes"}>
          <StickyNote className={`h-4 w-4 ${lead.notes ? "text-gold" : "text-muted-foreground/60"}`} fill={lead.notes ? "currentColor" : "none"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <p className="text-sm font-medium">Notes — {lead.name}</p>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Follow-up details, customisation discussed…" />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => onSave(lead, notes)}>
              <Save className="mr-1 h-3.5 w-3.5" /> Save notes
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// Lead detail sheet
// ============================================================

function LeadDetailSheet({
  lead,
  onClose,
  onStatus,
  onNotes,
  onDelete,
}: {
  lead: Lead;
  onClose: () => void;
  onStatus: (lead: Lead, status: string) => void;
  onNotes: (lead: Lead, notes: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(lead.notes);
  const { toast } = useToast();
  const { data: siteSettings } = useSettings();
  const brand = siteSettings?.brandName || "Artistic by Khushi";

  // Contextual WhatsApp follow-up — greets the customer by name and
  // references the piece they asked about (editable before sending).
  const firstName = lead.name.split(/\s+/)[0] || "there";
  const followUpText = lead.product
    ? `Hi ${firstName}! 👋 Thank you for your interest in "${lead.product}" from ${brand} 💛 I'd love to share more details, photos and customisation options — whenever you're ready!`
    : `Hi ${firstName}! 👋 Thank you for reaching out to ${brand} 💛 I'd love to help you find (or create) the perfect handcrafted piece — whenever you're ready!`;
  const whatsapp = lead.mobile
    ? `https://wa.me/${lead.mobile.replace(/\D/g, "")}?text=${encodeURIComponent(followUpText)}`
    : "";
  const cleanMobile = lead.mobile.replace(/\D/g, "");

  function copyMobile() {
    void navigator.clipboard
      .writeText(lead.mobile)
      .then(() => toast({ title: "Mobile number copied" }))
      .catch(() => toast({ title: "Copy blocked by browser", description: "Long-press the number to copy manually." }));
  }

  const rows: { label: string; value: string }[] = [
    { label: "Mobile", value: lead.mobile },
    { label: "City", value: lead.city || "—" },
    { label: "Product", value: lead.product || "—" },
    { label: "Category", value: lead.category || "—" },
    { label: "Preferred contact", value: lead.preferredContact || "—" },
    { label: "Source page", value: lead.sourcePage || "—" },
    { label: "UTM source", value: lead.utmSource || "—" },
    { label: "UTM medium", value: lead.utmMedium || "—" },
    { label: "UTM campaign", value: lead.utmCampaign || "—" },
    { label: "Referrer", value: lead.referrer || "—" },
    { label: "Received", value: fmtDate(lead.createdAt) },
    { label: "Google Sheets", value: lead.sheetSynced ? "✓ synced" : "not synced" },
  ];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto custom-scroll p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="font-display flex items-center gap-2">
            {lead.name}
            <LeadStatusBadge status={lead.status} />
          </SheetTitle>
          <SheetDescription>Received {timeAgo(lead.createdAt)}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* quick contact */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              title="Opens WhatsApp with a pre-filled follow-up message"
              className="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium text-green-700 hover:bg-secondary"
            >
              <MessageCircle className="h-5 w-5" style={{ width: 20, height: 20 }} /> WhatsApp
            </a>
            <a
              href={`tel:${lead.mobile}`}
              className="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium text-primary hover:bg-secondary"
            >
              <Phone className="h-5 w-5" style={{ width: 20, height: 20 }} /> Call
            </a>
            <button
              type="button"
              onClick={copyMobile}
              className="flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              <Copy className="h-5 w-5" style={{ width: 20, height: 20 }} /> Copy no.
            </button>
          </div>
          <p className="-mt-1 text-[11px] text-muted-foreground">
            WhatsApp opens with a ready-made follow-up message about this piece — you can edit it before sending.
          </p>

          {/* status */}
          <div>
            <p className="mb-1.5 text-sm font-medium">Status</p>
            <Select value={lead.status} onValueChange={(v) => onStatus(lead, v)}>
              <SelectTrigger className={`border font-medium ${leadStatusColor(lead.status)}`} aria-label="Lead status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* message */}
          {lead.message ? (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
              <p className="whitespace-pre-wrap text-sm">{lead.message}</p>
            </div>
          ) : null}

          {/* fields */}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {rows.map((r) => (
              <div key={r.label} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.label}</dt>
                <dd className="truncate" title={r.value}>{r.value}</dd>
              </div>
            ))}
            {lead.productUrl ? (
              <div className="col-span-2">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Product link</dt>
                <dd>
                  <a href={lead.productUrl.startsWith("#") ? lead.productUrl : `#${lead.productUrl}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                    {lead.productUrl}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>

          {/* notes */}
          <div>
            <p className="mb-1.5 text-sm font-medium">Notes</p>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Follow-up details…" />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={() => onNotes(lead, notes)}>
                <Save className="mr-1 h-3.5 w-3.5" /> Save notes
              </Button>
            </div>
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete inquiry
            </Button>
          </div>
          {cleanMobile && !cleanMobile.startsWith("91") ? (
            <p className="text-[11px] text-muted-foreground">Tip: WhatsApp needs the country code — if this number doesn&apos;t open WhatsApp, edit it with the country code (e.g. 91…).</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
