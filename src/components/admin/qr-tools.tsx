"use client";

/**
 * QR tools for the admin Products module.
 *
 * - `QrDialog` — per-product QR preview with download + copy link.
 * - `useExhibitionSheet` — one click builds a print-friendly A4 sheet with a
 *   QR card for every published product. Print it for craft fairs & display
 *   racks: visitors scan a code and land straight on the product page.
 */

import { useState } from "react";
import { Check, Copy, Download, Link2, Loader2, Printer, QrCode } from "lucide-react";
import type { PublicProduct, SiteSettings } from "@/lib/types";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Absolute site base — mirrors the /api/qr route logic (setting → origin). */
function siteBase(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function qrSrc(path: string, size = 480): string {
  return `/api/qr?path=${encodeURIComponent(path)}&size=${size}`;
}

// ============================================================
// Single-product QR dialog
// ============================================================

export function QrDialog({
  product,
  onClose,
}: {
  product: PublicProduct | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const path = product ? `/product/${product.slug}` : "";
  const fullUrl = product ? `${siteBase()}/#${path}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can select the text shown below */
    }
  };

  const download = () => {
    if (!product) return;
    const a = document.createElement("a");
    a.href = `${qrSrc(path, 800)}&download=1`;
    a.download = `qr-${product.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 font-display">
            <QrCode className="size-5 text-terracotta" aria-hidden="true" />
            QR code
          </DialogTitle>
          <DialogDescription>
            Scan lands visitors on this piece&apos;s page — perfect for exhibition cards and packaging inserts.
          </DialogDescription>
        </DialogHeader>

        {product ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border-2 border-dashed border-gold/50 bg-gold-soft/20 p-3">
              <img
                src={qrSrc(path)}
                alt={`QR code for ${product.name}`}
                width={224}
                height={224}
                className="size-56 rounded-lg bg-white"
              />
            </div>
            <div className="text-center">
              <p className="font-medium leading-tight">{product.name}</p>
              <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Link2 className="size-3" aria-hidden="true" />
                {fullUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={copyLink}>
                {copied ? (
                  <>
                    <Check className="mr-1 size-4 text-green-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 size-4" /> Copy link
                  </>
                )}
              </Button>
              <Button className="flex-1" onClick={download}>
                <Download className="mr-1 size-4" /> PNG
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Exhibition sheet — printable grid of QR cards
// ============================================================

/** Fetch every published product (page walk, cap 5×48 = 240 pieces). */
async function fetchAllProducts(): Promise<PublicProduct[]> {
  const first = await api.get<{ items: PublicProduct[]; totalPages: number }>(
    "/api/public/products?page=1&pageSize=48"
  );
  const items = [...first.items];
  for (let page = 2; page <= Math.min(first.totalPages, 5); page++) {
    const next = await api.get<{ items: PublicProduct[] }>(`/api/public/products?page=${page}&pageSize=48`);
    items.push(...next.items);
  }
  return items;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Opens a new window with a print-optimised sheet of QR cards and triggers
 * the browser print dialog. The window stays open so the owner can re-print
 * or save as PDF later.
 */
export async function openExhibitionSheet(settings: SiteSettings | null, brandName: string): Promise<void> {
  const products = await fetchAllProducts();
  if (products.length === 0) return;

  const base = settings?.siteUrl?.trim() || siteBase();
  const cards = products
    .map((p) => {
      const url = `${base.replace(/\/+$/, "")}/#/product/${p.slug}`;
      return `
        <div class="card">
          <img class="qr" src="/api/qr?path=${encodeURIComponent(`/product/${p.slug}`)}&size=420" alt="QR for ${escapeHtml(p.name)}" crossorigin="anonymous" />
          <h3>${escapeHtml(p.name)}</h3>
          <p class="cat">${escapeHtml(p.categoryName)}</p>
          <p class="scan">Scan to view &amp; enquire</p>
        </div>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(brandName)} — Exhibition QR Sheet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #3E2515; background: #FBF6EE; padding: 24px; }
  header { text-align: center; margin-bottom: 20px; }
  header h1 { font-size: 22px; letter-spacing: 0.04em; }
  header p { font-size: 12px; color: #8a6f5c; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .card {
    border: 1.5px solid #d9c3a5; border-radius: 10px; background: #fff;
    text-align: center; padding: 14px 10px 12px; break-inside: avoid; page-break-inside: avoid;
  }
  .card .qr { width: 110px; height: 110px; display: block; margin: 0 auto 8px; }
  .card h3 { font-size: 12.5px; line-height: 1.3; }
  .card .cat { font-size: 10px; color: #a9784f; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 3px; }
  .card .scan { font-size: 9.5px; color: #8a6f5c; margin-top: 5px; font-style: italic; }
  .hint { text-align: center; font-size: 10.5px; color: #8a6f5c; margin-top: 18px; }
  @media print {
    body { background: #fff; padding: 10mm; }
    .noprint { display: none; }
    .grid { gap: 10px; }
  }
  .noprint { text-align: center; margin-bottom: 16px; }
  .noprint button {
    font: 13px/1 sans-serif; background: #3E2515; color: #F3E5D0; border: 0;
    border-radius: 999px; padding: 10px 22px; cursor: pointer;
  }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(brandName)}</h1>
    <p>Handcrafted resin art · Scan any code to open the piece on your phone</p>
  </header>
  <div class="noprint">
    <button onclick="window.print()">🖨 Print this sheet</button>
  </div>
  <div class="grid">
    ${cards}
  </div>
  <p class="hint">Each code opens the live product page — visitors can enquire on WhatsApp instantly.</p>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 900); };</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

/** Toolbar button that generates the exhibition sheet (with busy state). */
export function ExhibitionSheetButton({
  settings,
  brandName,
}: {
  settings?: SiteSettings | null;
  brandName: string;
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await openExhibitionSheet(settings ?? null, brandName);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={run} disabled={busy} title="Printable QR sheet for every published product">
      {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Printer className="mr-1 h-4 w-4" />}
      Exhibition Sheet
    </Button>
  );
}
