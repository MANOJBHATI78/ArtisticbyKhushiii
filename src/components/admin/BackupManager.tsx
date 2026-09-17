"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, CheckCircle2, DatabaseBackup, Download, FileUp, Globe, KeyRound, Lock,
} from "lucide-react";
import { errMsg } from "./admin-utils";
import { Field, Spinner } from "./shared";

// ============================================================
// Backup & Sync — "live changes kabhi lose nahi honge" panel
// 1. Download backup  — poore site ka JSON file (safe keeping)
// 2. Restore backup   — JSON file wapas import (migration / recovery)
// 3. Pull from live   — kisi bhi live site ka content yahan le aao
// ============================================================

interface SyncReportUi {
  ok: boolean;
  source: string;
  counts: Record<string, number>;
  media: { downloaded: number; skipped: number; failed: number };
  warnings: string[];
}

const LAST_BACKUP_KEY = "abk_last_backup_at";

export function BackupManager() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // --- download ---
  const [includeLeads, setIncludeLeads] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string>(() => {
    try { return localStorage.getItem(LAST_BACKUP_KEY) ?? ""; } catch { return ""; }
  });

  // --- restore ---
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<{ name: string; snapshot: Record<string, unknown> } | null>(null);
  const [restoring, setRestoring] = useState(false);

  // --- pull from live ---
  const [sourceUrl, setSourceUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pullMedia, setPullMedia] = useState(true);
  const [pullLeads, setPullLeads] = useState(true);
  const [pulling, setPulling] = useState(false);

  const [report, setReport] = useState<SyncReportUi | null>(null);

  function refreshEverything() {
    void qc.invalidateQueries();
  }

  async function downloadBackup() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/backup?leads=${includeLeads ? "true" : "false"}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 17);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `abk-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const now = new Date().toISOString();
      setLastBackup(now);
      try { localStorage.setItem(LAST_BACKUP_KEY, now); } catch { /* private mode */ }
      toast({ title: "Backup downloaded", description: "File ko safe jagah rakho — isi se kabhi bhi restore kar sakte ho." });
    } catch (e) {
      toast({ title: "Backup failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }

  function pickFile(file: File | undefined | null) {
    setReport(null);
    if (!file) { setRestoreFile(null); return; }
    if (!file.name.endsWith(".json")) {
      toast({ title: "Sirf .json file chalegi", description: "Ye backup file nahi lag rahi.", variant: "destructive" });
      return;
    }
    file.text()
      .then((text) => {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const hasContent = parsed && (Array.isArray(parsed.products) || Array.isArray(parsed.categories) || parsed.settings);
        if (!hasContent) throw new Error("Is JSON mein Artistic by Khushi backup nahi lag rahi (products/categories/settings missing).");
        setRestoreFile({ name: file.name, snapshot: parsed });
      })
      .catch((e) => {
        setRestoreFile(null);
        toast({ title: "File padh nahi paaye", description: errMsg(e), variant: "destructive" });
      });
  }

  function snapshotCounts(snap: Record<string, unknown>) {
    const keys = ["products", "categories", "blogs", "pages", "faqs", "homepageSections", "landingPages", "leads", "mediaAssets"];
    return keys
      .map((k) => ({ k, n: Array.isArray(snap[k]) ? (snap[k] as unknown[]).length : 0 }))
      .filter((x) => x.n > 0);
  }

  async function restore() {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const rep = await api.post<SyncReportUi>("/api/admin/backup", {
        snapshot: restoreFile.snapshot,
        includeLeads: Array.isArray(restoreFile.snapshot.leads),
      });
      setReport(rep);
      refreshEverything();
      toast({ title: "Backup restored", description: `${rep.counts.products ?? 0} products, ${rep.counts.categories ?? 0} categories import ho gaye.` });
    } catch (e) {
      toast({ title: "Restore failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  }

  async function pull() {
    const url = sourceUrl.trim();
    if (!/^https?:\/\//.test(url)) {
      toast({ title: "Pura URL daalo", description: "Jaise: https://artisticbykhushiii.com", variant: "destructive" });
      return;
    }
    setPulling(true);
    setReport(null);
    try {
      const rep = await api.post<SyncReportUi>("/api/admin/backup/pull", {
        sourceUrl: url,
        email: email.trim() || undefined,
        password: password || undefined,
        includeMedia: pullMedia,
        includeLeads: pullLeads,
      });
      setReport(rep);
      refreshEverything();
      toast({ title: "Live content pulled", description: `${rep.counts.products ?? 0} products, ${rep.counts.blogs ?? 0} blogs aa gaye.` });
    } catch (e) {
      toast({ title: "Pull failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setPulling(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-gold/40 bg-gradient-to-br from-gold-soft/40 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseBackup className="size-5 text-terracotta" aria-hidden="true" />
            Backup &amp; Sync
          </CardTitle>
          <CardDescription>
            Aapki live site ke changes kabhi lose nahi honge. Deploy karne pe live data overwrite <strong>nahi</strong> hota —
            phir bhi backup rakhna best practice hai. Yahin se ek click mein poora backup lo, wapas restore karo, ya kisi
            live site ka content is site mein le aao.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---------- 1. Download ---------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Download className="size-4 text-terracotta" aria-hidden="true" /> 1. Backup Download
            </CardTitle>
            <CardDescription>Poore site ka JSON file — products, blogs, pages, FAQs, homepage, settings{includeLeads ? ", leads" : ""} sab kuch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch id="inc-leads" checked={includeLeads} onCheckedChange={setIncludeLeads} />
              <label htmlFor="inc-leads" className="text-sm">Leads (inquiries) bhi include karo</label>
            </div>
            <Button className="w-full" onClick={() => void downloadBackup()} disabled={downloading}>
              {downloading ? <Spinner className="mr-2" /> : <Download className="mr-2 h-4 w-4" />}
              {downloading ? "Ban raha hai…" : "Download Backup"}
            </Button>
            {lastBackup ? (
              <p className="text-xs text-muted-foreground">
                Last backup: <Badge variant="outline" className="ml-1 font-normal">{new Date(lastBackup).toLocaleString("en-IN")}</Badge>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Abhi tak koi backup nahi liya.</p>
            )}
          </CardContent>
        </Card>

        {/* ---------- 2. Restore ---------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileUp className="size-4 text-terracotta" aria-hidden="true" /> 2. Backup Restore
            </CardTitle>
            <CardDescription>Backup file se content wapas laao — nayi site pe migrate karna ya kuch galat ho jaye tab.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={restoring}>
              <FileUp className="mr-2 h-4 w-4" /> {restoreFile ? "Doosri file chuno" : "Backup JSON chuno"}
            </Button>
            {restoreFile ? (
              <div className="space-y-3 rounded-lg border bg-secondary/40 p-3">
                <p className="truncate text-xs font-medium">{restoreFile.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {snapshotCounts(restoreFile.snapshot).map((x) => (
                    <Badge key={x.k} variant="secondary" className="font-normal">
                      {x.n} {x.k.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Existing content update hoga (upsert) — delete kuch nahi hota except product images &amp; FAQs jo fresh banenge.
                </p>
                <Button className="w-full" onClick={() => void restore()} disabled={restoring}>
                  {restoring ? <Spinner className="mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {restoring ? "Restore ho raha hai…" : "Restore Karo"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ---------- 3. Pull from live ---------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-terracotta" aria-hidden="true" /> 3. Live Site Se Pull
            </CardTitle>
            <CardDescription>Live site ke saare changes (admin edits, naye products, sab) is database mein le aao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Live site URL">
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://artisticbykhushiii.com" inputMode="url" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Admin email">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@artisticbykhushi.com" autoComplete="off" />
              </Field>
              <Field label="Password">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              </Field>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <Switch id="pull-media" checked={pullMedia} onCheckedChange={setPullMedia} />
                <label htmlFor="pull-media" className="text-sm">Images bhi download</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="pull-leads" checked={pullLeads} onCheckedChange={setPullLeads} />
                <label htmlFor="pull-leads" className="text-sm">Leads bhi</label>
              </div>
            </div>
            <Button className="w-full" onClick={() => void pull()} disabled={pulling}>
              {pulling ? <Spinner className="mr-2" /> : <Globe className="mr-2 h-4 w-4" />}
              {pulling ? "Khinch raha hai… (1-2 min)" : "Pull From Live"}
            </Button>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lock className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              Source site ke admin se login karke content laate hain — password yahan store nahi hota.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ---------- report ---------- */}
      {report ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-green-700" aria-hidden="true" /> Sync Report
              <Badge variant="outline" className="ml-auto max-w-[220px] truncate font-normal">{report.source}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(report.counts)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg border bg-secondary/30 p-2.5 text-center">
                    <p className="text-lg font-semibold">{v}</p>
                    <p className="text-xs capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</p>
                  </div>
                ))}
            </div>
            {report.media ? (
              <>
                <Separator />
                <p className="text-sm">
                  Media: <strong>{report.media.downloaded}</strong> downloaded · {report.media.skipped} pehle se the ·{" "}
                  {report.media.failed > 0 ? <span className="text-destructive">{report.media.failed} failed</span> : <span>0 failed</span>}
                </p>
              </>
            ) : null}
            {report.warnings?.length ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
                <p className="mb-1 flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-4" aria-hidden="true" /> Warnings
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-amber-800/90 dark:text-amber-200/90">
                  {report.warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            ) : null}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <KeyRound className="size-3.5" aria-hidden="true" />
              Panel ko refresh karo taaki saare screens updated dikhain.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
