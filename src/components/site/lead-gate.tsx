"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, MessageCircleHeart, Package, Phone, PhoneCall, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSiteStore, type LeadGateState } from "@/lib/store";
import { trackLeadGateOpen, trackLeadGateSubmit } from "@/lib/track";
import { cn } from "@/lib/utils";

/** localStorage profile written after a successful gate pass — prefills the next visit. */
const CONTACT_PROFILE_KEY = "abk_contact_profile";

interface FieldErrors {
  name?: string;
  mobile?: string;
}

function validateName(v: string): string | undefined {
  const t = v.trim();
  if (t.length < 2 || t.length > 80) return "Please enter your name (2–80 characters).";
  return undefined;
}

function validateMobile(v: string): string | undefined {
  const t = v.trim();
  if (!/^\+?[\d\s-]{10,16}$/.test(t)) return "Enter a valid mobile number, e.g. +91 98765 43210.";
  const digits = t.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "Mobile number must contain 10–15 digits.";
  return undefined;
}

function readContactProfile(): { name: string; mobile: string } {
  try {
    const raw = localStorage.getItem(CONTACT_PROFILE_KEY);
    if (!raw) return { name: "", mobile: "" };
    const parsed = JSON.parse(raw) as { name?: unknown; mobile?: unknown };
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      mobile: typeof parsed.mobile === "string" ? parsed.mobile : "",
    };
  } catch {
    return { name: "", mobile: "" };
  }
}

function writeContactProfile(name: string, mobile: string): void {
  try {
    localStorage.setItem(CONTACT_PROFILE_KEY, JSON.stringify({ name, mobile }));
  } catch {
    /* storage unavailable (private mode) — the gate still works */
  }
}

interface GateFormProps {
  kind: LeadGateState["kind"];
  href: string;
  product: string;
  productUrl: string;
  category: string;
  close: () => void;
}

/**
 * The gate form itself — mounted fresh for every dialog open (Radix unmounts
 * the content on close), so the lazy state initializers re-read the saved
 * contact profile each time: returning visitors see their details and just
 * tap once.
 */
function GateForm({ kind, href, product, productUrl, category, close }: GateFormProps) {
  const [profile] = useState(readContactProfile);
  const [name, setName] = useState(profile.name);
  const [mobile, setMobile] = useState(profile.mobile);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);

  const isWhatsApp = kind === "whatsapp";

  // GA4: the gate appeared (external system — safe inside an effect).
  useEffect(() => {
    trackLeadGateOpen(kind);
  }, [kind]);

  // Focus the first empty field once the dialog content has mounted.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const target = !profile.name ? nameRef.current : !profile.mobile ? mobileRef.current : nameRef.current;
      target?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [profile.name, profile.mobile]);

  /** Navigate + capture — runs synchronously inside the click handler. */
  const submitGate = () => {
    const nextErrors: FieldErrors = {
      name: validateName(name),
      mobile: validateMobile(mobile),
    };
    setErrors(nextErrors);
    const firstInvalid = nextErrors.name ? nameRef : nextErrors.mobile ? mobileRef : null;
    if (firstInvalid?.current) {
      firstInvalid.current.focus();
      return;
    }

    // Remember the visitor so the next gate open is a single tap.
    writeContactProfile(name, mobile);

    // 1) Fire the lead capture FIRST — keepalive fetches survive the
    //    navigation below (even tel: attempts can cancel normal fetches).
    //    Never awaited, never blocks the connection.
    try {
      void fetch("/api/public/click-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          kind,
          sourcePage: window.location.pathname,
          product,
          productUrl,
          category,
          referrer: document.referrer,
          website: honeypot,
        }),
      }).catch((err: unknown) => {
        console.warn("[lead-gate] click-lead capture failed:", err instanceof Error ? err.message : err);
      });
    } catch (err) {
      console.warn("[lead-gate] click-lead capture failed:", err);
    }

    // 2) Connect — synchronous, inside the user gesture, so browsers never
    //    treat this as a popup. (window.open returns null with "noopener" by
    //    spec — that is expected, not a popup block.)
    if (isWhatsApp) {
      window.open(href, "_blank", "noopener");
    } else {
      window.location.href = href;
    }

    // 3) GA4 event + close the dialog.
    trackLeadGateSubmit(kind);
    close();
  };

  const errorClass = (has: boolean) => (has ? "border-destructive focus-visible:ring-destructive/30" : "");

  return (
    <form
      noValidate
      className="mt-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submitGate();
      }}
    >
      {/* Honeypot — hidden from humans, tempting for bots */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] size-0 opacity-0"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-gate-name">
            Name <span className="text-terracotta" aria-hidden="true">*</span>
          </Label>
          <Input
            id="lead-gate-name"
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
            }}
            placeholder="Your full name"
            maxLength={80}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "lead-gate-name-error" : undefined}
            className={cn("h-11", errorClass(!!errors.name))}
          />
          {errors.name ? (
            <p id="lead-gate-name-error" className="text-xs text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lead-gate-mobile">
            Mobile Number <span className="text-terracotta" aria-hidden="true">*</span>
          </Label>
          <Input
            id="lead-gate-mobile"
            ref={mobileRef}
            type="tel"
            inputMode="tel"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              if (errors.mobile) setErrors((p) => ({ ...p, mobile: undefined }));
            }}
            placeholder="+91 98765 43210"
            maxLength={16}
            autoComplete="tel"
            aria-invalid={!!errors.mobile}
            aria-describedby={errors.mobile ? "lead-gate-mobile-error" : undefined}
            className={cn("h-11", errorClass(!!errors.mobile))}
          />
          {errors.mobile ? (
            <p id="lead-gate-mobile-error" className="text-xs text-destructive">
              {errors.mobile}
            </p>
          ) : null}
        </div>
      </div>

      {/* CTA — pinned to the bottom of the scroll area on short viewports
          (mobile keyboards) so it can never be cut off. */}
      <div className="sticky bottom-0 -mx-6 mt-1 space-y-2.5 border-t border-border/60 bg-background/95 px-6 pb-1 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <Button
          type="button"
          size="lg"
          className={cn(
            "h-12 w-full rounded-full text-base text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
            isWhatsApp
              ? "bg-[#25D366] text-white shadow-md shadow-[#25D366]/30 hover:bg-[#1fb959]"
              : "bg-terracotta shadow-md shadow-terracotta/25 hover:bg-terracotta-deep"
          )}
          onClick={submitGate}
        >
          {isWhatsApp ? (
            <MessageCircle aria-hidden="true" />
          ) : (
            <Phone aria-hidden="true" />
          )}
          {isWhatsApp ? "Continue to WhatsApp" : "Call the studio"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full text-muted-foreground hover:text-foreground"
          onClick={close}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * WhatsApp / call lead gate — a small brand dialog that captures name +
 * mobile before connecting the visitor. Triggered by the global click
 * interceptor in SiteShell for every wa.me/<number> and tel: link.
 *
 * The submit handler navigates FIRST (synchronously inside the click, so
 * popup blockers allow it) and only then fires the click-lead POST — lead
 * capture is best-effort and never blocks the connection.
 */
export function LeadGateDialog() {
  const gate = useSiteStore((s) => s.leadGate);
  const closeLeadGate = useSiteStore((s) => s.closeLeadGate);

  const isWhatsApp = gate.kind === "whatsapp";
  const heading = isWhatsApp ? "Let's chat on WhatsApp ✨" : "We'll call you right back 📞";
  const HeadingIcon = isWhatsApp ? MessageCircleHeart : PhoneCall;

  return (
    <Dialog open={gate.open} onOpenChange={(open) => (open ? null : closeLeadGate())}>
      {/* Radix unmounts the content on close → the form re-mounts (and
          re-prefills from the saved profile) on every gate open. */}
      {gate.open ? (
        <DialogContent
          className="max-h-[92dvh] gap-0 overflow-y-auto custom-scroll pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Warm brand gradient strip — matches the inquiry dialog. */}
          <div
            aria-hidden="true"
            className="-mx-6 -mt-6 mb-5 h-1.5 rounded-t-lg bg-gradient-to-r from-gold-soft via-gold to-terracotta"
          />

          <DialogHeader className="space-y-0">
            <div className="flex items-start gap-3.5 text-left">
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-soft text-terracotta shadow-sm"
                aria-hidden="true"
              >
                <HeadingIcon className="size-6" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="font-display text-2xl leading-snug">{heading}</DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed">
                  Quick details first — we&apos;ll connect you instantly.
                </DialogDescription>
              </div>
            </div>

            {gate.product ? (
              <div className="mt-3.5">
                <Badge
                  variant="secondary"
                  className="h-auto max-w-full items-center gap-1.5 bg-gold-soft/70 px-3 py-1.5 text-xs font-medium text-accent-foreground"
                >
                  <Package className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate">
                    Interested in: <span className="font-semibold">{gate.product}</span>
                  </span>
                </Badge>
              </div>
            ) : null}

            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0 text-gold" aria-hidden="true" />
              Your number stays with us — no spam, ever.
            </p>
          </DialogHeader>

          <GateForm
            kind={gate.kind}
            href={gate.href}
            product={gate.product}
            productUrl={gate.productUrl}
            category={gate.category}
            close={closeLeadGate}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
