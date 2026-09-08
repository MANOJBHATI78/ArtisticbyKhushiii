"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { MediaAsset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ImagePlus, Search, Trash2, Upload } from "lucide-react";
import { useAdminMedia } from "./useAdminData";
import { uploadMediaFile } from "./media-picker";
import { ConfirmDialog, EmptyState } from "./shared";
import { errMsg, formatBytes, timeAgo } from "./admin-utils";

// ============================================================
// Media library — uploads, grid, inline alt/caption editing.
// ============================================================

const PAGE_SIZE = 24;

export function MediaLibrary() {
  const { data: media, isLoading } = useAdminMedia();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; pct: number }[]>([]);
  const [uploadErr, setUploadErr] = useState("");
  const [toDelete, setToDelete] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const list = media ?? [];
    const needle = q.trim().toLowerCase();
    return needle
      ? list.filter((m) => m.filename.toLowerCase().includes(needle) || (m.alt || "").toLowerCase().includes(needle))
      : list;
  }, [media, q]);

  const visible = filtered.slice(0, visibleCount);

  function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadErr("");
    setUploads(list.map((f) => ({ name: f.name, pct: 0 })));

    const jobs = list.map((file, i) =>
      uploadMediaFile(
        file,
        { alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") },
        (pct) => {
          setUploads((u) => u.map((x, j) => (j === i ? { ...x, pct } : x)));
        },
      )
        .then(() => {
          setUploads((u) => u.filter((_, j) => j !== i));
          return null;
        })
        .catch((e) => {
          setUploadErr(`${file.name}: ${errMsg(e)}`);
          return null;
        }),
    );

    void Promise.all(jobs).then(() => {
      void qc.invalidateQueries({ queryKey: ["admin", "media"] });
      setUploads([]);
      toast({ title: "Upload finished", description: `${list.length} image${list.length === 1 ? "" : "s"} processed.` });
    });
  }

  function saveField(m: MediaAsset, patch: Partial<Pick<MediaAsset, "alt" | "caption" | "title">>) {
    const prev = qc.getQueryData<MediaAsset[]>(["admin", "media"]);
    if (prev) qc.setQueryData(["admin", "media"], prev.map((x) => (x.id === m.id ? { ...x, ...patch } : x)));
    api
      .put(`/api/admin/media/${m.id}`, patch)
      .then(() => toast({ title: "Saved", description: m.filename }))
      .catch((e) => {
        if (prev) qc.setQueryData(["admin", "media"], prev);
        toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
      });
  }

  function copyUrl(m: MediaAsset) {
    const url = `${window.location.origin}${m.url}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast({ title: "URL copied", description: url }))
      .catch(() => toast({ title: "Copy blocked by browser", description: m.url }));
  }

  function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    api
      .delete(`/api/admin/media/${toDelete.id}`)
      .then(() => {
        toast({ title: "Image deleted", description: toDelete.filename });
        setToDelete(null);
        void qc.invalidateQueries({ queryKey: ["admin", "media"] });
      })
      .catch((e) => toast({ title: "Delete failed", description: errMsg(e), variant: "destructive" }))
      .finally(() => setDeleting(false));
  }

  return (
    <div className="space-y-4">
      {/* dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload images"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-gold hover:bg-secondary/40"
        }`}
      >
        {uploads.length > 0 ? (
          <div className="w-full max-w-sm space-y-1.5">
            <p className="text-sm font-medium text-primary">Uploading…</p>
            {uploads.map((u) => (
              <div key={u.name} className="text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span className="truncate">{u.name}</span>
                  <span>{u.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${u.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Upload className="h-7 w-7 text-muted-foreground" style={{ width: 28, height: 28 }} />
            <p className="text-sm font-medium">Drag &amp; drop images here, or click to browse</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF · up to 8MB each · auto-compressed to WebP</p>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {uploadErr ? <p className="text-sm text-destructive">{uploadErr}</p> : null}

      {/* search */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="Search by filename or alt text…" className="pl-8" aria-label="Search media" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} images</p>
      </div>

      {/* grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ImagePlus className="h-8 w-8 text-muted-foreground/50" />} title="No images yet" hint="Upload your product photos — they&apos;ll be available everywhere in the console." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {visible.map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <div className="relative aspect-square bg-secondary">
                  { }
                  <img src={m.url} alt={m.alt || m.filename} className="h-full w-full object-cover" loading="lazy" />
                  {m.url.startsWith("/uploads/") ? null : (
                    <Badge className="absolute left-1.5 top-1.5 bg-secondary/90 text-[10px] text-secondary-foreground" variant="secondary">
                      site image
                    </Badge>
                  )}
                </div>
                <CardContent className="space-y-1.5 p-2">
                  <p className="truncate text-xs font-medium" title={m.filename}>
                    {m.filename}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(m.size)} · {timeAgo(m.createdAt)}
                  </p>
                  <Input
                    defaultValue={m.alt}
                    placeholder="Alt text"
                    className="h-7 text-xs"
                    onBlur={(e) => e.target.value !== m.alt && saveField(m, { alt: e.target.value })}
                    aria-label={`Alt text for ${m.filename}`}
                  />
                  <Input
                    defaultValue={m.caption}
                    placeholder="Caption"
                    className="h-7 text-xs"
                    onBlur={(e) => e.target.value !== m.caption && saveField(m, { caption: e.target.value })}
                    aria-label={`Caption for ${m.filename}`}
                  />
                  <div className="flex gap-1 pt-0.5">
                    <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => copyUrl(m)}>
                      <Copy className="mr-1 h-3 w-3" /> URL
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setToDelete(m)} aria-label={`Delete ${m.filename}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {visibleCount < filtered.length ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Load more ({filtered.length - visibleCount} left)
              </Button>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.filename ?? ""}”?`}
        description={
          toDelete?.url.startsWith("/uploads/")
            ? "The file is removed from the server. Products or pages using it will lose the image."
            : "This is a site content image (from /images). The console entry is removed but the file on disk stays — useful if the site still references it."
        }
        confirmLabel="Delete image"
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </div>
  );
}
