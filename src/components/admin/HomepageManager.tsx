"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { HomepageSection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { useAdminHomepage } from "./useAdminData";
import { EmptyState, Field, ImageThumb, Spinner } from "./shared";
import { RichTextEditor } from "./rich-text-editor";
import { MediaPickField } from "./media-picker";
import { errMsg, parseItems, serializeItems, type SectionItem } from "./admin-utils";

// ============================================================
// Homepage sections editor
// ============================================================

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero — top banner",
  brand_intro: "Brand Intro — about the studio",
  why_choose: "Why Choose — benefits grid",
  custom_orders: "Custom Orders — personalised section",
  memory_preservation: "Memory Preservation — keepsakes",
  final_cta: "Final CTA — closing banner",
};

const RICH_SECTIONS = new Set(["brand_intro", "custom_orders", "memory_preservation"]);
const ITEMS_SECTIONS = new Set(["why_choose", "brand_intro", "custom_orders"]);

export function HomepageManager() {
  const { data: sections, isLoading } = useAdminHomepage();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return <EmptyState title="No homepage sections found" hint="Sections should exist from seeding. Try re-running the seed script." />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Edit the homepage building blocks. “Save” applies each section separately.</p>
      {sections.map((s) => (
        <SectionCard key={s.sectionKey} section={s} />
      ))}
    </div>
  );
}

function SectionCard({ section }: { section: HomepageSection }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [heading, setHeading] = useState(section.heading);
  const [subheading, setSubheading] = useState(section.subheading);
  const [body, setBody] = useState(section.body);
  const [imageUrl, setImageUrl] = useState(section.imageUrl);
  const [mobileImageUrl, setMobileImageUrl] = useState(section.mobileImageUrl || "");
  const [ctaText, setCtaText] = useState(section.ctaText);
  const [ctaUrl, setCtaUrl] = useState(section.ctaUrl);
  const [ctaText2, setCtaText2] = useState(section.ctaText2);
  const [ctaUrl2, setCtaUrl2] = useState(section.ctaUrl2);
  const [visible, setVisible] = useState(section.visible);
  const [displayOrder, setDisplayOrder] = useState(section.displayOrder);
  const [items, setItems] = useState<SectionItem[]>(() => parseItems(section.itemsJson));
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
    }
  }, []);

  const rich = RICH_SECTIONS.has(section.sectionKey);
  const withItems = ITEMS_SECTIONS.has(section.sectionKey);

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        heading,
        subheading,
        body,
        imageUrl,
        mobileImageUrl,
        ctaText,
        ctaUrl,
        ctaText2,
        ctaUrl2,
        visible,
        displayOrder,
      };
      if (withItems) payload.itemsJson = serializeItems(items);
      await api.put(`/api/admin/homepage/${section.sectionKey}`, payload);
      toast({ title: "Section saved", description: SECTION_LABELS[section.sectionKey] ?? section.sectionKey });
      void qc.invalidateQueries({ queryKey: ["admin", "homepage"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
      void qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) {
      toast({ title: "Save failed", description: errMsg(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisible(next: boolean) {
    const prev = visible;
    setVisible(next);
    try {
      await api.put(`/api/admin/homepage/${section.sectionKey}`, { visible: next });
      toast({ title: next ? "Section shown" : "Section hidden", description: SECTION_LABELS[section.sectionKey] });
      void qc.invalidateQueries({ queryKey: ["admin", "homepage"] });
      void qc.invalidateQueries({ queryKey: ["home"] });
    } catch (e) {
      setVisible(prev);
      toast({ title: "Update failed", description: errMsg(e), variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardHeader className="p-0">
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex items-center gap-3 p-4">
            <ImageThumb src={imageUrl} alt={heading} size={48} />
            <CollapsibleTrigger asChild>
              <button type="button" className="min-w-0 flex-1 text-left">
                <p className="truncate font-medium">{SECTION_LABELS[section.sectionKey] ?? section.sectionKey}</p>
                <p className="truncate text-xs text-muted-foreground">{heading || subheading || "—"}</p>
              </button>
            </CollapsibleTrigger>
            <Badge variant="outline" className="hidden sm:inline-flex">order {displayOrder}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => void toggleVisible(!visible)}
              aria-label={visible ? "Hide section" : "Show section"}
              title={visible ? "Visible on site — click to hide" : "Hidden — click to show"}
            >
              {visible ? <Eye className="h-4 w-4 text-green-700" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden h-8 w-8 items-center justify-center rounded-md hover:bg-secondary sm:inline-flex"
              title="Preview site"
              aria-label="Preview site"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={open ? "Collapse" : "Expand"}>
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <CardContent className="space-y-4 border-t p-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Heading">
                  <Input value={heading} onChange={(e) => setHeading(e.target.value)} />
                </Field>
                <Field label="Subheading">
                  <Input value={subheading} onChange={(e) => setSubheading(e.target.value)} />
                </Field>
              </div>

              <Field label="Body" hint={rich ? "Rich content (HTML toolbar)." : "Plain text / simple HTML."}>
                {rich ? (
                  <RichTextEditor value={body} onChange={setBody} rows={6} />
                ) : (
                  <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
                )}
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Image (Desktop)" hint="Landscape / square crop — dikheta hai desktop + tablet pe.">
                  <MediaPickField value={imageUrl} alt={heading} onPick={(p) => setImageUrl(p.url)} onClear={() => setImageUrl("")} />
                </Field>
                <Field label="Image (Mobile) — optional" hint="Phone pe alag portrait crop chahte ho to yahan daalo. Khali chhodo to desktop image hi phone pe poori dikhegi (no crop).">
                  <MediaPickField value={mobileImageUrl} alt={heading ? `${heading} mobile` : "mobile"} onPick={(p) => setMobileImageUrl(p.url)} onClear={() => setMobileImageUrl("")} />
                </Field>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="CTA 1 text">
                      <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Shop Now" />
                    </Field>
                    <Field label="CTA 1 link">
                      <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="#/products" />
                    </Field>
                    <Field label="CTA 2 text">
                      <Input value={ctaText2} onChange={(e) => setCtaText2(e.target.value)} placeholder="Custom Orders" />
                    </Field>
                    <Field label="CTA 2 link">
                      <Input value={ctaUrl2} onChange={(e) => setCtaUrl2(e.target.value)} placeholder="#/contact" />
                    </Field>
                  </div>
                </div>
              </div>

              {withItems ? (
                <Field label="List items" hint="Feature cards rendered as a grid on the site.">
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="rounded-lg border p-2.5">
                        <div className="flex items-start gap-2">
                          <div className="grid flex-1 gap-2 sm:grid-cols-2">
                            <Input
                              value={item.title}
                              onChange={(e) => setItems(items.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)))}
                              placeholder="Item title"
                              aria-label={`Item ${idx + 1} title`}
                            />
                            <Textarea
                              rows={2}
                              value={item.text}
                              onChange={(e) => setItems(items.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it)))}
                              placeholder="Item description"
                              aria-label={`Item ${idx + 1} text`}
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => setItems(swap(items, idx, idx - 1))} aria-label="Move item up">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" disabled={idx === items.length - 1} onClick={() => setItems(swap(items, idx, idx + 1))} aria-label="Move item down">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7 text-destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))} aria-label="Remove item">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { title: "", text: "" }])}>
                      <Plus className="mr-1 h-4 w-4" /> Add item
                    </Button>
                  </div>
                </Field>
              ) : null}

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch id={`vis-${section.sectionKey}`} checked={visible} onCheckedChange={(v) => void toggleVisible(v)} />
                  <label htmlFor={`vis-${section.sectionKey}`} className="text-sm">Visible</label>
                </div>
                <Field label="Display order">
                  <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)} className="w-24" />
                </Field>
                <span className="flex-1" />
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? <Spinner className="mr-1" /> : <Save className="mr-1 h-4 w-4" />}
                  Save section
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}

function swap<T>(arr: T[], i: number, j: number): T[] {
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}
