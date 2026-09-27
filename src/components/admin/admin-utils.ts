"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

// ============================================================
// Admin panel shared utilities (client-side)
// ============================================================

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export type AdminModuleKey =
  | "dashboard"
  | "products"
  | "categories"
  | "blogs"
  | "pages"
  | "faqs"
  | "testimonials"
  | "leads"
  | "media"
  | "homepage"
  | "landing"
  | "backup"
  | "settings"
  | "users"
  | "schemas";

/** Extracts a human readable message from an error (ApiError or anything). */
export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Something went wrong. Please try again.";
}

/** "3 days ago", "just now"… */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? parseISO(iso) : new Date(iso);
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "—";
  }
}

/** "12 Feb 2025, 4:30 pm" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy, h:mm a");
  } catch {
    return "—";
  }
}

/** Local datetime-local value: "2025-02-12T16:30" */
export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

/** 1234 → "1.2 KB" */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Same slug rules as the server slugify(). */
export function slugifyClient(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(s: string): boolean {
  return s === "" || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

/** Builds a querystring, skipping empty params. */
export function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === "all") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function initialsOf(name: string): string {
  return (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------- CSV ----------------

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return "\uFEFF" + lines.join("\r\n"); // BOM so Excel opens UTF-8 correctly
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------- status colors ----------------

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-gold-soft text-espresso border-gold/40",
  CONTACTED: "bg-terracotta/15 text-terracotta-deep border-terracotta/30",
  FOLLOW_UP: "bg-amber-100 text-amber-800 border-amber-300",
  CONVERTED: "bg-green-100 text-green-800 border-green-300",
  NOT_INTERESTED: "bg-muted text-muted-foreground border-border",
  CLOSED: "bg-gray-200 text-gray-600 border-gray-300",
};

export function leadStatusColor(status: string): string {
  return LEAD_STATUS_COLORS[status] || "bg-muted text-muted-foreground border-border";
}

// ---------------- itemsJson helpers (homepage sections) ----------------

export interface SectionItem {
  title: string;
  text: string;
}

export function parseItems(raw: string | null | undefined): SectionItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => {
      const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
      return { title: String(o.title ?? ""), text: String(o.text ?? "") };
    });
  } catch {
    return [];
  }
}

export function serializeItems(items: SectionItem[]): string {
  return JSON.stringify(items.filter((i) => i.title.trim() || i.text.trim()));
}

/** Debounce helper for search inputs. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
