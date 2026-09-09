"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ImageIcon, Wand2, ChevronLeft, ChevronRight } from "lucide-react";
import { isValidSlug, leadStatusColor, slugifyClient } from "./admin-utils";

// ============================================================
// Shared admin UI atoms
// ============================================================

// ---------------- Status badges ----------------

export function PublishedBadge({ published }: { published: boolean }) {
  return (
    <Badge variant="outline" className={published ? "bg-green-100 text-green-800 border-green-300" : "bg-muted text-muted-foreground border-border"}>
      {published ? "Published" : "Draft"}
    </Badge>
  );
}

export function BlogStatusBadge({ status, publishAt }: { status: string; publishAt?: string | null }) {
  if (status === "PUBLISHED") return <PublishedBadge published />;
  if (status === "SCHEDULED")
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
        Scheduled
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
      Draft
    </Badge>
  );
}

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={leadStatusColor(status)}>
      {status.replace("_", " ")}
    </Badge>
  );
}

// ---------------- Confirm dialog ----------------

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  pending?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  onConfirm,
  pending = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // keep dialog open while pending
              onConfirm();
            }}
            className={
              destructive
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }
            disabled={pending}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------- Google-style SEO preview ----------------

export function GooglePreview({ title, url, description }: { title: string; url: string; description: string }) {
  const t = title || "Your page title appears here";
  const d = description || "Your meta description appears here. Keep it under 160 characters so it is not cut off in Google search results.";
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-[11px] leading-4 text-muted-foreground mb-1 truncate">{url || "artisticbykhushi.com"}</p>
      <p className="text-lg leading-6 text-[#1a0dab] dark:text-blue-300 truncate font-medium">{t.slice(0, 60)}</p>
      <p className="text-sm leading-5 text-muted-foreground line-clamp-2">{d.slice(0, 165)}</p>
      <p className="mt-2 text-[11px] text-muted-foreground/70">Google search result preview (approximate)</p>
    </div>
  );
}

// ---------------- Slug input ----------------

export function SlugInput({
  value,
  onChange,
  from,
  placeholder = "auto-generated-from-title",
}: {
  value: string;
  onChange: (v: string) => void;
  from: string;
  placeholder?: string;
}) {
  const [touched, setTouched] = useState(false);
  const lastAuto = useRef("");

  useEffect(() => {
    if (touched) return;
    const auto = slugifyClient(from);
    if (auto !== lastAuto.current) {
      lastAuto.current = auto;
      onChange(auto);
    }
     
  }, [from, touched]);

  return (
    <div className="space-y-1.5">
      <Label>Slug (URL)</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setTouched(true);
            onChange(e.target.value.toLowerCase().replace(/\s+/g, "-"));
          }}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Re-generate from title"
          onClick={() => {
            setTouched(false);
            const auto = slugifyClient(from);
            lastAuto.current = auto;
            onChange(auto);
          }}
        >
          <Wand2 className="h-4 w-4" />
        </Button>
      </div>
      {value && !isValidSlug(value) ? (
        <p className="text-xs text-destructive">Lowercase letters, numbers and single hyphens only.</p>
      ) : (
        <p className="text-xs text-muted-foreground">Shown in the URL, e.g. #/product/{value || "your-slug"}</p>
      )}
    </div>
  );
}

// ---------------- Char counter ----------------

export function CharCount({ text, target }: { text: string; target: number }) {
  const len = (text || "").length;
  const over = len > target;
  return (
    <span className={`text-xs ${over ? "text-destructive font-medium" : "text-muted-foreground"}`}>
      {len}/{target} {over ? "— too long" : "characters"}
    </span>
  );
}

// ---------------- Image thumbnail ----------------

export function ImageThumb({ src, alt, size = 40, className = "" }: { src?: string | null; alt?: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-md bg-secondary text-muted-foreground shrink-0 ${className}`}
        aria-label={alt || "No image"}
        role="img"
      >
        <ImageIcon style={{ width: size / 2.2, height: size / 2.2 }} />
      </div>
    );
  }
  return (
     
    <img
      src={src}
      alt={alt || ""}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={() => setBroken(true)}
      className={`rounded-md object-cover shrink-0 border ${className}`}
    />
  );
}

// ---------------- Pagination ----------------

export function PaginationBar({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) {
    return total > 0 ? (
      <p className="text-xs text-muted-foreground">
        {total} item{total === 1 ? "" : "s"}
      </p>
    ) : null;
  }
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <p className="text-xs text-muted-foreground">
        {total} items · page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageList(page, totalPages).map((p) =>
          p === "…" ? (
            <span key={`e${Math.random()}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPage(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}
        <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function pageList(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) out.push(p);
  if (page < totalPages - 2) out.push("…");
  out.push(totalPages);
  return out;
}

// ---------------- Empty / loading states ----------------

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 px-4 text-center">
      {icon ?? <ImageIcon className="h-8 w-8 text-muted-foreground/50" />}
      <p className="font-medium text-foreground">{title}</p>
      {hint ? <p className="text-sm text-muted-foreground max-w-sm">{hint}</p> : null}
      {action}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} aria-label="Loading" />;
}

// ---------------- Field wrapper ----------------

export function Field({
  label,
  required,
  hint,
  error,
  children,
  counter,
  icon,
  className = "",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  counter?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          {icon}
          {label}
          {required ? <span className="text-destructive ml-0.5">*</span> : null}
        </Label>
        {counter}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
