"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { NavLink, SiteSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, BarChart3, Check, Code2, Copy, ExternalLink, Facebook, Instagram, ListPlus, MessageCircle, PartyPopper, Pin, Radar, Save, SearchCheck, ShoppingCart, Star, Trash2, TriangleAlert, Type, Youtube } from "lucide-react";
import { useAdminSettings } from "./useAdminData";
import { Field, Spinner } from "./shared";
import { MediaPickField } from "./media-picker";
import { errMsg } from "./admin-utils";
import { Switch } from "@/components/ui/switch";
import { OfferBanner } from "@/components/site/offer-banner";

const DEFAULT_HEADER_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const DEFAULT_FOOTER_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "All Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "My Favourites", href: "/wishlist" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Search", href: "/search" },
];

/** Editable {label, href} list stored as JSON in a settings key ("" = defaults). */
function LinkListEditor({
  value,
  onChange,
  placeholderHref,
  defaults,
}: {
  value: string;
  onChange: (json: string) => void;
  placeholderHref: string;
  defaults: NavLink[];
}) {
  const links: NavLink[] = useMemo(() => {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.label === "string" && typeof x.href === "string") : [];
    } catch {
      return [];
    }
  }, [value]);

  function commit(next: NavLink[]) {
    onChange(next.length === 0 ? "" : JSON.stringify(next));
  }
  function update(i: number, patch: Partial<NavLink>) {
    commit(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  }

  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={l.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Label"
            className="h-9 w-32 shrink-0"
            aria-label={`Link ${i + 1} label`}
          />
          <Input
            value={l.href}
            onChange={(e) => update(i, { href: e.target.value })}
            placeholder={placeholderHref}
            className="h-9"
            aria-label={`Link ${i + 1} URL`}
          />
          <div className="flex shrink-0 items-center">
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
              <ArrowUp className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => move(i, 1)} disabled={i === links.length - 1} aria-label="Move down">
              <ArrowDown className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => commit(links.filter((_, idx) => idx !== i))} aria-label="Delete link">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-1"
        onClick={() => commit([...links, { label: "New link", href: "/" }])}
      >
        + Add link
      </Button>
      {links.length === 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Empty = the built-in default links are shown on the site.</p>
          <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={() => commit(defaults)}>
            Start from the current links
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => commit([])}>
          Reset to defaults
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Site settings — brand, contact, social, footer, SEO defaults,
// analytics & tracking integrations.
// ============================================================

const GA_ID_RE = /^G-[A-Z0-9]{6,12}$/i;
const CLARITY_ID_RE = /^[A-Z0-9]{6,16}$/i;

/** ISO string → value for <input type="datetime-local"> (local time). */
function isoToLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local input value → ISO string for storage. */
function localInputToIso(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function StatusPill({ on, label = "Not set" }: { on: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        on ? "border-green-200 bg-green-50 text-green-700" : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-green-500" : "bg-muted-foreground/40"}`} />
      {on ? "Live on site" : label}
    </span>
  );
}

/** Counts HTML tags (<meta, <script, <link, <noscript, <style) in pasted custom code. */
function countTags(code: string): number {
  return (code.match(/<\s*(meta|script|link|noscript|style)\b/gi) ?? []).length;
}

/** Pill for the Custom Code card — how many tags will render ("N tags live" / "Off"). */
function CodePill({ count }: { count: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        count > 0 ? "border-green-200 bg-green-50 text-green-700" : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${count > 0 ? "bg-green-500" : "bg-muted-foreground/40"}`} />
      {count > 0 ? `${count} tag${count === 1 ? "" : "s"} live` : "Off"}
    </span>
  );
}

export function SettingsManager() {
  const { data: settings, isLoading } = useAdminSettings();
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const initRef = useRef(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  // ---- Google Shopping card: count <item>s in the live feed (client check) ----
  const [feedCount, setFeedCount] = useState<number | null>(null);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const feedEnabled = form?.shoppingFeedEnabled === "1";
  useEffect(() => {
    let cancelled = false;
    fetch("/shopping-feed.xml")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((xml) => {
        if (cancelled) return;
        setFeedCount(new DOMParser().parseFromString(xml, "application/xml").getElementsByTagName("item").length);
      })
      .catch(() => {
        if (!cancelled) setFeedCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [feedEnabled]);

  // The feed URL to submit in Merchant Center — the live domain's URL when
  // we're on it, otherwise the production URL (the sandbox is not public).
  const feedUrl = useMemo(() => {
    if (typeof window !== "undefined" && window.location.hostname.includes("artisticbykhushiii")) {
      return `${window.location.origin}/shopping-feed.xml`;
    }
    return "https://artisticbykhushiii.com/shopping-feed.xml";
  }, []);

  function copyFeedUrl() {
    void navigator.clipboard
      .writeText(feedUrl)
      .then(() => {
        setCopiedFeed(true);
        toast({ title: "Feed URL copied", description: "Paste it in Google Merchant Center → Products → Feeds." });
        setTimeout(() => setCopiedFeed(false), 2000);
      })
      .catch(() => toast({ title: "Copy blocked by browser", description: "Long-press the URL to copy it manually." }));
  }

  useEffect(() => {
    if (settings && !initRef.current) {
      initRef.current = true;
      // The offer deadline is stored as ISO; the input wants datetime-local.
      setForm({ ...DEFAULT_SETTINGS, ...settings, offerBannerEndsAt: isoToLocalInput(settings.offerBannerEndsAt) });
    }
  }, [settings]);

  const dirty = useMemo(() => {
    if (!form || !settings) return false;
    // Compare in the same "form" space (deadline as datetime-local input value).
    const baseline = { ...DEFAULT_SETTINGS, ...settings, offerBannerEndsAt: isoToLocalInput(settings.offerBannerEndsAt) };
    return JSON.stringify(baseline) !== JSON.stringify(form);
  }, [form, settings]);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      // Convert the datetime-local deadline to ISO for storage.
      const res = await api.put<SiteSettings>("/api/admin/settings", {
        ...form,
        offerBannerEndsAt: localInputToIso(form.offerBannerEndsAt),
      });
      initRef.current = false;
      setForm({ ...DEFAULT_SETTINGS, ...res, offerBannerEndsAt: isoToLocalInput(res.offerBannerEndsAt) });
      toast({ title: "Settings saved", description: "The website header, footer and SEO defaults were updated." });
      // refresh the public site caches immediately
      void qc.invalidateQueries({ queryKey: ["settings"] });
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
      void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        toast({
          title: "Session expired",
          description: "Your admin login ended. Open the site in a new tab, log in again, come back and press Save — this form keeps your values.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !form) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  const waPreview = form.whatsappNumber
    ? `https://wa.me/${form.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(form.whatsappMessage)}`
    : "";

  return (
    <div className="space-y-4 pb-16">
      {/* ---------- Brand ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Brand</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Brand name">
            <Input value={form.brandName} onChange={(e) => set("brandName", e.target.value)} />
          </Field>
          <Field label="Tagline">
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Logo">
            <div className="flex items-center gap-3">
              {form.logoUrl ? (
                 
                <img src={form.logoUrl} alt="Logo preview" width={48} height={48} className="rounded-lg border object-cover" />
              ) : null}
              <MediaPickField value={form.logoUrl} alt="Logo" onPick={(p) => set("logoUrl", p.url)} onClear={() => set("logoUrl", "")} />
            </div>
          </Field>
          <Field label="Logo text" hint="Shown next to the logo in the header.">
            <Input value={form.logoText} onChange={(e) => set("logoText", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* ---------- Contact & WhatsApp ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Contact &amp; WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Phone" hint="Shown on the site, e.g. +91 83201 12554">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field
            label="WhatsApp number"
            hint="Country code + number, digits only — e.g. 918320112554"
          >
            <Input
              value={form.whatsappNumber}
              onChange={(e) => set("whatsappNumber", e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="918320112554"
            />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="WhatsApp message" hint="Pre-filled text when customers tap the WhatsApp button.">
            <Textarea rows={2} value={form.whatsappMessage} onChange={(e) => set("whatsappMessage", e.target.value)} />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </Field>
          </div>
          <Field label="Service areas" hint="Shown in the footer & shipping info." className="md:col-span-2">
            <Input value={form.serviceAreas} onChange={(e) => set("serviceAreas", e.target.value)} />
          </Field>
          {waPreview ? (
            <div className="md:col-span-2">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Live WhatsApp link preview</p>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
                <MessageCircle className="h-5 w-5 shrink-0 text-green-700" style={{ width: 20, height: 20 }} />
                <a href={waPreview} target="_blank" rel="noreferrer" className="truncate text-sm text-primary underline">
                  {waPreview}
                </a>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ---------- Social links ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Social Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Instagram URL" icon={<Instagram className="h-3.5 w-3.5 text-primary" />}>
            <Input value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} placeholder="https://instagram.com/…" />
          </Field>
          <Field label="Facebook URL" icon={<Facebook className="h-3.5 w-3.5 text-primary" />}>
            <Input value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} placeholder="https://facebook.com/…" />
          </Field>
          <Field label="Pinterest URL" icon={<Pin className="h-3.5 w-3.5 text-primary" />}>
            <Input value={form.pinterestUrl} onChange={(e) => set("pinterestUrl", e.target.value)} placeholder="https://pinterest.com/…" />
          </Field>
          <Field label="YouTube URL" icon={<Youtube className="h-3.5 w-3.5 text-primary" />}>
            <Input value={form.youtubeUrl} onChange={(e) => set("youtubeUrl", e.target.value)} placeholder="https://youtube.com/@…" />
          </Field>
        </CardContent>
      </Card>

      {/* ---------- Footer & content ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Footer &amp; Site Content</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Footer about" hint="Short brand story in the footer." className="md:col-span-2">
            <Textarea rows={3} value={form.footerAbout} onChange={(e) => set("footerAbout", e.target.value)} />
          </Field>
          <Field label="Copyright text">
            <Input value={form.copyrightText} onChange={(e) => set("copyrightText", e.target.value)} />
          </Field>
          <Field label="Announcement bar" hint="Strip under the header — leave empty to hide. (Hidden while a festive offer banner is running.)">
            <Input value={form.announcements} onChange={(e) => set("announcements", e.target.value)} />
          </Field>
          <Field label="Header CTA text">
            <Input value={form.headerCtaText} onChange={(e) => set("headerCtaText", e.target.value)} />
          </Field>
          <Field label="Header CTA link">
            <Input value={form.headerCtaUrl} onChange={(e) => set("headerCtaUrl", e.target.value)} placeholder="/contact" />
          </Field>
        </CardContent>
      </Card>

      {/* ---------- Festive offer banner ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <PartyPopper className="h-4 w-4 text-terracotta" />
            Festive Offer Banner
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Diwali / sale / festivity ke liye header ke upar ek countdown banner chalao —{" "}
            <strong>no code change needed</strong>. Banner apne aap hide ho jayega jab countdown zero ho jayega.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Show offer banner</p>
              <p className="text-xs text-muted-foreground">While ON, this replaces the normal announcement bar.</p>
            </div>
            <Switch
              checked={form.offerBannerEnabled === "1"}
              onCheckedChange={(c) => set("offerBannerEnabled", c ? "1" : "0")}
              aria-label="Show festive offer banner"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Offer message" hint="e.g. “Diwali Dhamaka — 15% off on all nameplates!”" className="md:col-span-2">
              <Input
                value={form.offerBannerText}
                onChange={(e) => set("offerBannerText", e.target.value)}
                placeholder="✨ Diwali Dhamaka — flat 15% off on everything!"
                maxLength={140}
              />
            </Field>
            <Field label="Coupon code" hint="Optional — visitors tap to copy it.">
              <Input
                value={form.offerBannerCode}
                onChange={(e) => set("offerBannerCode", e.target.value.toUpperCase())}
                placeholder="DIWALI15"
                maxLength={20}
                className="font-semibold uppercase tracking-wider"
              />
            </Field>
            <Field label="Offer ends at" hint="Countdown runs till this moment (your local time).">
              <Input
                type="datetime-local"
                value={form.offerBannerEndsAt}
                onChange={(e) => set("offerBannerEndsAt", e.target.value)}
              />
            </Field>
            <Field
              label="Banner button link"
              hint="Optional — e.g. #/products, #/lp/diwali-gifting or any https:// link."
              className="md:col-span-2"
            >
              <Input
                value={form.offerBannerLinkUrl}
                onChange={(e) => set("offerBannerLinkUrl", e.target.value)}
                placeholder="#/products"
              />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              Live preview
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/80">how visitors will see it</span>
            </p>
            <div className="overflow-hidden rounded-xl border shadow-inner">
              <OfferBanner
                previewMode
                enabled={form.offerBannerEnabled}
                text={form.offerBannerText}
                code={form.offerBannerCode}
                endsAt={localInputToIso(form.offerBannerEndsAt)}
                linkUrl={form.offerBannerLinkUrl}
              />
            </div>
            {form.offerBannerEnabled === "1" && !form.offerBannerEndsAt ? (
              <p className="mt-1.5 text-xs text-amber-600">
                Tip: set an end date — the banner (and countdown) shows only until then. Preview above uses a sample 3-day timer.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* ---------- SEO defaults ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">SEO Defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Default SEO title" className="md:col-span-2">
            <Input value={form.defaultSeoTitle} onChange={(e) => set("defaultSeoTitle", e.target.value)} />
          </Field>
          <Field label="Default meta description" className="md:col-span-2">
            <Textarea rows={2} value={form.defaultMetaDescription} onChange={(e) => set("defaultMetaDescription", e.target.value)} />
          </Field>
          <Field label="Default OG image" hint="Social-share fallback image.">
            <div className="flex items-center gap-3">
              {form.defaultOgImage ? (
                 
                <img src={form.defaultOgImage} alt="OG image preview" width={48} height={48} className="rounded-lg border object-cover" />
              ) : null}
              <MediaPickField value={form.defaultOgImage} alt="OG image" onPick={(p) => set("defaultOgImage", p.url)} onClear={() => set("defaultOgImage", "")} />
            </div>
          </Field>
          <Field label="Site URL" hint="Your live site address — used in the sitemap, Google verification & social share previews. Must include https://">
            <Input value={form.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} placeholder="https://artisticbykhushiii.com" />
          </Field>
        </CardContent>
      </Card>

      {/* ---------- Analytics & tracking integrations ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <BarChart3 className="h-4 w-4 text-primary" />
            Analytics &amp; Tracking
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Paste the IDs, press <strong>Save settings</strong> — tracking goes live on the public website instantly. Leave a field empty to keep that tool off.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Google Analytics ID"
              icon={<BarChart3 className="h-3.5 w-3.5 text-primary" />}
              hint="GA4 Measurement ID — starts with “G-”. Rendered into the page HTML (visible in View Source). Leave empty to disable."
              error={
                form.googleAnalyticsId && !GA_ID_RE.test(form.googleAnalyticsId)
                  ? "That doesn't look like a GA4 ID — it should look like G-ABC123456 (find it in Google Analytics → Admin → Data streams)."
                  : undefined
              }
              counter={<StatusPill on={GA_ID_RE.test(form.googleAnalyticsId)} />}
            >
              <Input value={form.googleAnalyticsId} onChange={(e) => set("googleAnalyticsId", e.target.value)} placeholder="G-ABC123456" />
            </Field>
            <Field
              label="Google Search Console token"
              icon={<SearchCheck className="h-3.5 w-3.5 text-primary" />}
              hint="Search Console → Settings → Ownership verification → HTML tag → copy the content value and paste it here (full tag is also OK). Save, then press Verify in Google."
              counter={<StatusPill on={Boolean(form.googleSearchConsoleToken.trim())} />}
            >
              <Input value={form.googleSearchConsoleToken} onChange={(e) => set("googleSearchConsoleToken", e.target.value)} placeholder='google-site-verification=TOKEN' />
            </Field>
            <Field
              label="Microsoft Clarity project ID"
              icon={<Radar className="h-3.5 w-3.5 text-primary" />}
              hint="Free heatmaps & session recordings from clarity.microsoft.com."
              error={
                form.microsoftClarityProjectId && !CLARITY_ID_RE.test(form.microsoftClarityProjectId)
                  ? "Clarity IDs are 8–12 letters/numbers — find yours in Clarity → Settings → Project ID."
                  : undefined
              }
              counter={<StatusPill on={CLARITY_ID_RE.test(form.microsoftClarityProjectId)} />}
            >
              <Input value={form.microsoftClarityProjectId} onChange={(e) => set("microsoftClarityProjectId", e.target.value)} placeholder="abcdefghij" />
            </Field>
            <Field
              label="Google Sheets webhook URL"
              hint="Google Apps Script web app URL — every new inquiry is also forwarded there."
              counter={<StatusPill on={Boolean(form.googleSheetsWebhookUrl.trim())} />}
            >
              <Input value={form.googleSheetsWebhookUrl} onChange={(e) => set("googleSheetsWebhookUrl", e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Where do I get these?</span>
            <a href="https://analytics.google.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Google Analytics <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Search Console <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://clarity.microsoft.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Microsoft Clarity <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {/* How to verify with Google — step-by-step for the owner */}
          <details className="group rounded-lg border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground marker:content-none">
              <SearchCheck className="mr-1 inline size-3.5 text-primary" />
              How to connect Google (Analytics + Search Console) — step by step
              <span className="ml-1 text-muted-foreground/70 group-open:hidden">&#9662;</span>
              <span className="ml-1 hidden text-muted-foreground/70 group-open:inline">&#9652;</span>
            </summary>
            <div className="mt-2.5 space-y-2 leading-relaxed">
              <p><strong className="text-foreground">Google Analytics:</strong> analytics.google.com → Admin (gear icon) → Data streams → your website → the “G-…” ID at the top right. Paste it in the field above and Save. It goes live on the site instantly and is also visible in the page source (Ctrl+U).</p>
              <p><strong className="text-foreground">Google Search Console:</strong></p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>search.google.com/search-console → Add property → <em>URL prefix</em> → <code className="rounded bg-muted px-1">{(form.siteUrl || "https://artisticbykhushiii.com").trim().replace(/\/+$/, "")}</code></li>
                <li>Choose the <strong>“HTML tag”</strong> verification method.</li>
                <li>Google shows a meta tag — copy its <strong>content</strong> value (or the whole tag) into the “Google Search Console token” field above.</li>
                <li>Press <strong>Save settings</strong> here, then go back to Google and press <strong>Verify</strong>.</li>
              </ol>
              <p>After verifying: Sitemaps → add <code className="rounded bg-muted px-1">/sitemap.xml</code>. Done — Google starts indexing the site.</p>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* ---------- Navigation links (header + footer) ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <ListPlus className="size-4 text-primary" /> Website Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium">Header menu links</p>
            <p className="mb-3 text-xs text-muted-foreground">Jo links website ke header mein dikhte hain. Order badal sakte ho, delete kar sakte ho, naye add kar sakte ho.</p>
            <LinkListEditor
              value={form.headerNavLinks}
              onChange={(v) => set("headerNavLinks", v)}
              placeholderHref="/products"
              defaults={DEFAULT_HEADER_LINKS}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Footer “Explore” links</p>
            <p className="mb-3 text-xs text-muted-foreground">Footer ke Explore column ke links. Collections column apne aap categories se banta hai.</p>
            <LinkListEditor
              value={form.footerExploreLinks}
              onChange={(v) => set("footerExploreLinks", v)}
              placeholderHref="/products"
              defaults={DEFAULT_FOOTER_LINKS}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---------- Google Business Profile reviews ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <Star className="size-4 text-primary" /> Google Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field
            label="Google Places API key"
            hint="Google Cloud Console → enable “Places API (New)” → create API key. Site pe real Google reviews dikhane ke liye."            
            counter={<StatusPill on={Boolean(form.googlePlacesApiKey.trim())} />}
          >
            <Input
              type="password"
              value={form.googlePlacesApiKey}
              onChange={(e) => set("googlePlacesApiKey", e.target.value.trim())}
              placeholder="AIza…"
              autoComplete="off"
            />
          </Field>
          <Field
            label="Google Business Place ID"
            hint="Google Business Profile ka Place ID (ChIJ… format). Dono set karne par homepage pe reviews section dikhega."
            counter={<StatusPill on={Boolean(form.googlePlaceId.trim())} />}
          >
            <Input
              value={form.googlePlaceId}
              onChange={(e) => set("googlePlaceId", e.target.value.trim())}
              placeholder="ChIJ…"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground md:col-span-2">
            <span className="font-medium text-foreground">How to find Place ID?</span>
            <a
              href="https://developers.google.com/maps/documentation/places/web-service/place-id"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Place ID finder <ExternalLink className="h-3 w-3" />
            </a>
            <span>·</span>
            <a href="https://console.cloud.google.com/apis/library/places.googleapis.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Enable Places API <ExternalLink className="h-3 w-3" />
            </a>
            <span className="md:col-span-2">Dono khali chhodne par ye section site pe nahi dikhega — jab tak set nahi karte.</span>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Custom code injection (advanced) ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <Code2 className="size-4 text-primary" /> Custom Code (Advanced)
            <span className="ml-auto">
              <CodePill count={countTags(`${form.customHeadCode}\n${form.customBodyCode}`)} />
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Verification meta tags, Google Tag Manager, pixels, chat widgets — paste the code once and it renders on
            every page of the site.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
            <TriangleAlert className="mr-1.5 inline size-3.5 align-[-2px]" />
            <strong>Be careful:</strong> code you paste here renders on every page of the live site (server-side,
            visible in View Source). Only paste code you trust — e.g. tags from Google, Bing, Pinterest, Facebook.
          </div>
          <div className="grid gap-4">
            <Field
              label="Head code"
              hint="Rendered just before </head> — meta verification tags, GTM, analytics pixels."
            >
              <Textarea
                rows={5}
                value={form.customHeadCode}
                onChange={(e) => set("customHeadCode", e.target.value)}
                placeholder={'<meta name="msvalidate.01" content="YOUR-BING-CODE" />'}
                className="font-mono text-xs leading-relaxed"
                spellCheck={false}
              />
            </Field>
            <Field
              label="Body code"
              hint="Rendered right after <body> opens — noscript tags, chat widgets."
            >
              <Textarea
                rows={4}
                value={form.customBodyCode}
                onChange={(e) => set("customBodyCode", e.target.value)}
                placeholder="<!-- Google Tag Manager (noscript) or a chat widget snippet -->"
                className="font-mono text-xs leading-relaxed"
                spellCheck={false}
              />
            </Field>
          </div>
          <details className="group rounded-lg border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground marker:content-none">
              <Code2 className="mr-1 inline size-3.5 text-primary" />
              What does pasted code look like? (examples)
              <span className="ml-1 text-muted-foreground/70 group-open:hidden">&#9662;</span>
              <span className="ml-1 hidden text-muted-foreground/70 group-open:inline">&#9652;</span>
            </summary>
            <div className="mt-2.5 space-y-2 leading-relaxed">
              <p>Paste the snippet exactly as the provider gives it to you. For example:</p>
              <p className="font-medium text-foreground">Google Search Console verification (head code):</p>
              <pre className="custom-scroll overflow-x-auto rounded-lg border bg-card p-3 font-mono text-[11px] leading-relaxed">{`<meta name="google-site-verification" content="AbCdEf123456" />`}</pre>
              <p className="font-medium text-foreground">Bing verification (head code):</p>
              <pre className="custom-scroll overflow-x-auto rounded-lg border bg-card p-3 font-mono text-[11px] leading-relaxed">{`<meta name="msvalidate.01" content="AbCdEf1234567890" />`}</pre>
              <p>
                Pinterest / Facebook domain verification tags look the same — copy them from the provider, paste in
                Head code, press <strong>Save settings</strong>. Leave everything else as-is.
              </p>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* ---------- Google Shopping / Merchant Center ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <ShoppingCart className="size-4 text-primary" /> Google Shopping / Merchant Center
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            A product feed Google can read — show your pieces on Google Shopping for free.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Product feed</p>
              <p className="text-xs text-muted-foreground">
                Only published products with a price are included — enquiry-only pieces are skipped.
              </p>
            </div>
            <Switch
              checked={feedEnabled}
              onCheckedChange={(c) => set("shoppingFeedEnabled", c ? "1" : "0")}
              aria-label="Enable Google Shopping product feed"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Feed URL — submit this URL in Google Merchant Center</p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={feedUrl}>
                {feedUrl}
              </code>
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={copyFeedUrl}>
                {copiedFeed ? <Check className="mr-1 h-3.5 w-3.5 text-green-700" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                {copiedFeed ? "Copied" : "Copy"}
              </Button>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                (feedCount ?? 0) > 0
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${(feedCount ?? 0) > 0 ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              {feedCount === null ? "Feed check unavailable" : feedCount > 0 ? `${feedCount} products in feed` : "No products with a price yet"}
            </span>
          </div>

          <details className="group rounded-lg border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium text-foreground marker:content-none">
              <ShoppingCart className="mr-1 inline size-3.5 text-primary" />
              How to submit the feed in Google Merchant Center — step by step
              <span className="ml-1 text-muted-foreground/70 group-open:hidden">&#9662;</span>
              <span className="ml-1 hidden text-muted-foreground/70 group-open:inline">&#9652;</span>
            </summary>
            <div className="mt-2.5 space-y-2 leading-relaxed">
              <ol className="ml-4 list-decimal space-y-1">
                <li>Go to <a href="https://merchantcenter.google.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">merchantcenter.google.com <ExternalLink className="h-3 w-3" /></a> and sign in with your Google account.</li>
                <li>Open <strong>Products → Feeds</strong> and click <strong>+</strong> (Add file / scheduled fetch).</li>
                <li>Paste the feed URL above as the fetch URL. Name it e.g. “Artistic by Khushiii”.</li>
                <li>Country: <strong>India</strong> · Language: English · Currency: <strong>INR</strong>.</li>
                <li>Save — Google then fetches the feed automatically every day.</li>
              </ol>
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-amber-800">
                Note: products need a price to appear in the feed — edit a product and set its price (Products → edit
                → Price). Without a price they stay enquiry-only.
              </p>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* ---------- sticky save bar ---------- */}
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 md:bottom-4 md:px-6">
        <div className="flex w-full items-center justify-between gap-2 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Type className="hidden h-3.5 w-3.5" />
            {dirty ? "You have unsaved changes" : "All settings saved"}
          </p>
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
