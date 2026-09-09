"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { SiteSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Facebook, Instagram, MessageCircle, Pin, Save, Type, Youtube } from "lucide-react";
import { useAdminSettings } from "./useAdminData";
import { Field, Spinner } from "./shared";
import { MediaPickField } from "./media-picker";
import { errMsg } from "./admin-utils";

// ============================================================
// Site settings — brand, contact, social, footer, SEO defaults.
// ============================================================

export function SettingsManager() {
  const { data: settings, isLoading } = useAdminSettings();
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const initRef = useRef(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (settings && !initRef.current) {
      initRef.current = true;
      setForm({ ...DEFAULT_SETTINGS, ...settings });
    }
  }, [settings]);

  const dirty = useMemo(() => {
    if (!form || !settings) return false;
    return JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }) !== JSON.stringify(form);
  }, [form, settings]);

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const res = await api.put<SiteSettings>("/api/admin/settings", form);
      initRef.current = false;
      setForm({ ...DEFAULT_SETTINGS, ...res });
      toast({ title: "Settings saved", description: "The website header, footer and SEO defaults were updated." });
      // refresh the public site caches immediately
      void qc.invalidateQueries({ queryKey: ["settings"] });
      void qc.invalidateQueries({ queryKey: ["bootstrap"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
      void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
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
          <Field label="Announcement bar" hint="Scrolling/ highlight strip under the header — leave empty to hide.">
            <Input value={form.announcements} onChange={(e) => set("announcements", e.target.value)} />
          </Field>
          <Field label="Header CTA text">
            <Input value={form.headerCtaText} onChange={(e) => set("headerCtaText", e.target.value)} />
          </Field>
          <Field label="Header CTA link">
            <Input value={form.headerCtaUrl} onChange={(e) => set("headerCtaUrl", e.target.value)} placeholder="#/contact" />
          </Field>
        </CardContent>
      </Card>

      {/* ---------- SEO defaults ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">SEO &amp; Integrations</CardTitle>
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
          <Field label="Site URL" hint="https://yourdomain.com — used in sitemap & canonical tags.">
            <Input value={form.siteUrl} onChange={(e) => set("siteUrl", e.target.value)} placeholder="https://artisticbykhushi.com" />
          </Field>
          <Field label="Google Analytics ID" hint="Format G-XXXXXXX — leave empty to disable.">
            <Input value={form.googleAnalyticsId} onChange={(e) => set("googleAnalyticsId", e.target.value)} placeholder="G-XXXXXXX" />
          </Field>
          <Field label="Google Search Console token" hint="Verification token / file content.">
            <Input value={form.googleSearchConsoleToken} onChange={(e) => set("googleSearchConsoleToken", e.target.value)} />
          </Field>
          <Field
            label="Google Sheets webhook URL"
            hint="Google Apps Script web app URL — every new inquiry is also forwarded there."
            className="md:col-span-2"
          >
            <Input value={form.googleSheetsWebhookUrl} onChange={(e) => set("googleSheetsWebhookUrl", e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
          </Field>
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
