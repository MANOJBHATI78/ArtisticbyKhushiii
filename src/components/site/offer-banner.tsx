"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Sparkles, X } from "lucide-react";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

// ============================================================
// Festive offer banner — admin-managed strip above the header
// with a LIVE countdown to the offer deadline, optional coupon
// code (tap to copy) and CTA link. Everything comes from Site
// Settings (Site Settings → Festive Offer Banner), so the owner
// can run Diwali / New Year / sale campaigns without any code
// change. Auto-hides when the countdown reaches zero.
// ============================================================

const DISMISS_KEY = "abk_offer_dismissed";

/** Parses the stored deadline (ISO or datetime-local string) → epoch ms, or null. */
function parseDeadline(raw: string): number | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex flex-col items-center" aria-hidden="true">
      <span className="flex min-w-8 items-center justify-center rounded-md bg-espresso/45 px-1.5 py-0.5 font-display text-sm font-semibold leading-none tabular-nums text-gold-soft ring-1 ring-gold/25 sm:text-base">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-cream/70">{label}</span>
    </span>
  );
}

export function OfferBanner({
  enabled,
  text,
  code,
  endsAt,
  linkUrl,
  ctaLabel,
  previewMode = false,
}: {
  enabled: string;
  text: string;
  code: string;
  endsAt: string;
  linkUrl: string;
  ctaLabel?: string;
  /** Admin settings live preview — always visible, no dismiss button, placeholders allowed. */
  previewMode?: boolean;
}) {
  const deadline = useMemo(() => parseDeadline(endsAt), [endsAt]);
  const [now, setNow] = useState<number>(() => Date.now());
  // Dismissed offers stay hidden for the whole browsing session (never in preview).
  const [dismissed, setDismissed] = useState(() => {
    if (previewMode) return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);

  // Tick every second while the banner is visible.
  useEffect(() => {
    if (!deadline || deadline <= now) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline, now]);

  const previewDeadline = previewMode && deadline === null ? now + 3 * 86_400_000 : deadline;
  const activeDeadline = previewMode ? previewDeadline : deadline;
  const isActive =
    (previewMode || enabled === "1") &&
    (previewMode || text.trim().length > 0) &&
    activeDeadline !== null &&
    activeDeadline > now;

  if (!isActive || (!previewMode && dismissed)) return null;

  const remaining = Math.max(0, (activeDeadline ?? now) - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  // Screen-reader friendly static summary (the ticking numbers are aria-hidden).
  const srDeadline = new Date(activeDeadline ?? now).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (!previewMode) track("offer_code_copy", { code });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — code is still visible to read */
    }
  };

  const displayText = text.trim() || (previewMode ? "Your festive offer message will shine here ✨" : "");

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
    setDismissed(true);
  };

  const cta = linkUrl?.trim() ? (
    <a
      href={linkUrl.startsWith("#") || linkUrl.startsWith("/") ? `#${linkUrl.replace(/^#/, "")}` : linkUrl}
      target={linkUrl.startsWith("http") ? "_blank" : undefined}
      rel={linkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
      onClick={() => track("offer_banner_click", { link: linkUrl })}
      className="shrink-0 rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-espresso shadow-sm transition-all hover:bg-gold-soft hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream sm:text-sm"
    >
      {ctaLabel || "Shop the Offer"}
    </a>
  ) : null;

  return (
    <div
      role="region"
      aria-label="Limited-time offer"
      className="relative overflow-hidden bg-gradient-to-r from-terracotta-deep via-terracotta to-terracotta-deep"
    >
      {/* Soft shimmer sweep (motion-safe) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 motion-safe:animate-[offer-sweep_3.2s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,236,190,0.16) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-10 py-2 sm:px-12">
        <p className="flex items-center gap-1.5 text-center text-xs font-medium text-cream sm:text-sm">
          <Sparkles className="size-4 shrink-0 text-gold-soft" aria-hidden="true" />
          <span>{displayText}</span>
          <Sparkles className="size-4 shrink-0 text-gold-soft" aria-hidden="true" />
        </p>

        {/* Countdown — hidden on very small screens to keep one tidy line */}
        <span className="hidden items-center gap-1.5 min-[420px]:flex">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-cream/80">Ends in</span>
          <TimeBox value={days} label="days" />
          <TimeBox value={hours} label="hrs" />
          <TimeBox value={minutes} label="min" />
          <TimeBox value={seconds} label="sec" />
        </span>

        {code ? (
          <button
            type="button"
            onClick={copyCode}
            aria-label={`Copy coupon code ${code}`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-gold/70 bg-espresso/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold-soft transition-all hover:bg-espresso/50 hover:ring-2 hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream sm:text-sm"
            )}
          >
            {copied ? <Check className="size-3.5 text-gold" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            {copied ? "Copied!" : code}
          </button>
        ) : null}

        {cta}

        {/* Screen-reader summary of the ticking countdown */}
        <span className="sr-only">Offer ends on {srDeadline}.</span>

        {previewMode ? null : (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss offer banner"
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-cream/75 transition-colors hover:bg-cream/15 hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
