"use client";

import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MediaAsset } from "@/lib/types";
import { useAdminMedia } from "./useAdminData";
import { errMsg, formatBytes } from "./admin-utils";
import { Spinner } from "./shared";
import { Check, ImagePlus, Search, Upload } from "lucide-react";

// ============================================================
// Media picker dialog + XHR upload helper with progress.
// ============================================================

export interface UploadResult {
  media: MediaAsset;
  url: string;
}

/** Uploads a file to /api/admin/media with progress reporting. */
export function uploadMediaFile(
  file: File,
  meta: { alt?: string; caption?: string; title?: string } = {},
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (meta.alt) form.append("alt", meta.alt);
    if (meta.caption) form.append("caption", meta.caption);
    if (meta.title) form.append("title", meta.title);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Upload failed — network error."));
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as { ok: boolean; data?: UploadResult; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && payload.ok && payload.data) {
          resolve(payload.data);
        } else {
          reject(new Error(payload.error || `Upload failed (${xhr.status}).`));
        }
      } catch {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.send(form);
  });
}

export interface MediaPick {
  url: string;
  alt: string;
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = "Pick an image",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (pick: MediaPick) => void;
  title?: string;
}) {
  const { data: media, isLoading } = useAdminMedia();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const list = media || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (m) => m.filename.toLowerCase().includes(needle) || (m.alt || "").toLowerCase().includes(needle),
    );
  }, [media, q]);

  function handleUpload(file: File) {
    setUploading(true);
    setUploadErr("");
    setProgress(0);
    uploadMediaFile(file, { alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") }, setProgress)
      .then((res) => {
        void qc.invalidateQueries({ queryKey: ["admin", "media"] });
        setSelected(res.media);
        setUploading(false);
      })
      .catch((e) => {
        setUploadErr(errMsg(e));
        setUploading(false);
      });
  }

  function confirm() {
    if (!selected) return;
    onSelect({ url: selected.url, alt: selected.alt });
    onOpenChange(false);
    setSelected(null);
    setQ("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>Choose from your media library or upload a new image.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload new</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by filename or alt…" className="pl-8" />
            </div>
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Spinner className="h-6 w-6" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No images yet — upload one from the other tab.</p>
            ) : (
              <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto custom-scroll pr-1 sm:grid-cols-4">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelected(m)}
                    className={`group relative overflow-hidden rounded-lg border-2 text-left transition ${
                      selected?.id === m.id ? "border-primary" : "border-transparent hover:border-gold/60"
                    }`}
                    aria-pressed={selected?.id === m.id}
                  >
                    { }
                    <img src={m.url} alt={m.alt || m.filename} className="aspect-square w-full object-cover" loading="lazy" />
                    {selected?.id === m.id ? (
                      <span className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                    <span className="block truncate bg-background/80 px-1.5 py-1 text-[10px] text-muted-foreground">
                      {m.filename}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-3 space-y-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-10 text-muted-foreground transition hover:border-gold hover:text-foreground"
            >
              {uploading ? (
                <>
                  <Spinner className="h-6 w-6" />
                  <span className="text-sm">Uploading… {progress}%</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Click to choose an image (JPG, PNG, WebP, GIF · max 8MB)</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            {uploadErr ? <p className="text-sm text-destructive">{uploadErr}</p> : null}
          </TabsContent>
        </Tabs>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                { }
                <img src={selected.url} alt="" className="h-10 w-10 rounded border object-cover" />
                <span className="truncate text-xs text-muted-foreground">
                  {selected.filename} · {formatBytes(selected.size)}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">No image selected</span>
            )}
          </div>
          <Button onClick={confirm} disabled={!selected}>
            <Check className="mr-1 h-4 w-4" /> Use image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small button + thumb combo used inside forms to pick one image. */
export function MediaPickField({
  value,
  alt,
  onPick,
  onClear,
  size = 64,
}: {
  value: string;
  alt?: string;
  onPick: (pick: MediaPick) => void;
  onClear?: () => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? (
         
        <img
          src={value}
          alt={alt || ""}
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="rounded-lg border object-cover"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="flex items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground"
        >
          <ImagePlus className="h-5 w-5" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <ImagePlus className="mr-1 h-4 w-4" /> {value ? "Change" : "Pick image"}
        </Button>
        {value && onClear ? (
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onClear}>
            Remove
          </Button>
        ) : null}
      </div>
      <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={onPick} />
    </div>
  );
}
