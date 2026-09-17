"use client";

import { useRef, useState } from "react";
import { Loader2, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { useProducts } from "@/lib/queries";
import { navigate, useHashRoute } from "@/lib/router";
import { useSiteStore } from "@/lib/store";
import { trackInquirySubmit } from "@/lib/track";
import { cn } from "@/lib/utils";

const UTM_KEYS = { source: "abk_utm_source", medium: "abk_utm_medium", campaign: "abk_utm_campaign" } as const;

interface FieldErrors {
  name?: string;
  mobile?: string;
  city?: string;
}

interface InquiryFormProps {
  /** Modal uses the inquiryContext product; the contact page allows free typing. */
  className?: string;
  submitLabel?: string;
}

function readUtm(key: string): string {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
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

function validateCity(v: string): string | undefined {
  const t = v.trim();
  if (t.length < 2 || t.length > 80) return "Please tell us your city or location (helps us plan delivery).";
  return undefined;
}

/**
 * Shared lead-capture form used by the global InquiryModal and the Contact page.
 * On success the user is routed to #/thank-you with the lead reference stored.
 */
export function InquiryForm({ className, submitLabel = "Send Inquiry" }: InquiryFormProps) {
  const { toast } = useToast();
  const route = useHashRoute();
  const inquiryContext = useSiteStore((s) => s.inquiryContext);
  const closeInquiry = useSiteStore((s) => s.closeInquiry);
  const setLastLeadRef = useSiteStore((s) => s.setLastLeadRef);

  const hasProductContext = !!inquiryContext?.productName;

  const { data: productsData } = useProducts(1, 48, "", "");
  const productNames = (productsData?.items || []).map((p) => p.name);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [product, setProduct] = useState("");
  const [message, setMessage] = useState("");
  const [preferredContact, setPreferredContact] = useState("whatsapp");
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const nextErrors: FieldErrors = {
      name: validateName(name),
      mobile: validateMobile(mobile),
      city: validateCity(city),
    };
    setErrors(nextErrors);

    const firstInvalid = nextErrors.name ? nameRef : nextErrors.mobile ? mobileRef : nextErrors.city ? cityRef : null;
    if (firstInvalid?.current) {
      firstInvalid.current.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ leadId: string; sheetSynced: boolean }>("/api/public/leads", {
        name: name.trim(),
        mobile: mobile.trim(),
        city: city.trim(),
        product: hasProductContext ? inquiryContext?.productName : product.trim(),
        productUrl: hasProductContext ? inquiryContext?.productUrl || "" : "",
        category: hasProductContext ? inquiryContext?.category || "" : "",
        message: message.trim(),
        preferredContact,
        sourcePage: route.path,
        utmSource: readUtm(UTM_KEYS.source),
        utmMedium: readUtm(UTM_KEYS.medium),
        utmCampaign: readUtm(UTM_KEYS.campaign),
        referrer: typeof document !== "undefined" ? document.referrer : "",
        honeypot,
      });
      setLastLeadRef(String(res.leadId ?? ""));
      // GA4: inquiry_submit only on SUCCESS (lead saved server-side).
      trackInquirySubmit({
        product: hasProductContext ? inquiryContext?.productName || "" : product.trim(),
        category: hasProductContext ? inquiryContext?.category || "" : "",
        sourcePage: route.path,
      });
      closeInquiry();
      navigate("/thank-you");
    } catch (err) {
      toast({
        title: "Couldn't send your inquiry",
        description: err instanceof Error ? err.message : "Please try again, or reach us on WhatsApp.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const errorClass = (has: boolean) => (has ? "border-destructive focus-visible:ring-destructive/30" : "");

  return (
    <form onSubmit={handleSubmit} noValidate className={cn("space-y-4", className)}>
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
          <Label htmlFor="iq-name">
            Name <span className="text-terracotta" aria-hidden="true">*</span>
          </Label>
          <Input
            id="iq-name"
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
            aria-describedby={errors.name ? "iq-name-error" : undefined}
            className={cn("h-11", errorClass(!!errors.name))}
          />
          {errors.name ? (
            <p id="iq-name-error" className="text-xs text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="iq-mobile">
            Mobile Number <span className="text-terracotta" aria-hidden="true">*</span>
          </Label>
          <Input
            id="iq-mobile"
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
            aria-describedby={errors.mobile ? "iq-mobile-error" : undefined}
            className={cn("h-11", errorClass(!!errors.mobile))}
          />
          {errors.mobile ? (
            <p id="iq-mobile-error" className="text-xs text-destructive">
              {errors.mobile}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="iq-city">
          City / Location <span className="text-terracotta" aria-hidden="true">*</span>
        </Label>
        <Input
          id="iq-city"
          ref={cityRef}
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            if (errors.city) setErrors((p) => ({ ...p, city: undefined }));
          }}
          placeholder="e.g. Surat, Gujarat"
          maxLength={80}
          autoComplete="address-level2"
          aria-invalid={!!errors.city}
          aria-describedby={errors.city ? "iq-city-error" : undefined}
          className={cn("h-11", errorClass(!!errors.city))}
        />
        {errors.city ? (
          <p id="iq-city-error" className="text-xs text-destructive">
            {errors.city}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="iq-product">Product you&apos;re interested in</Label>
        {hasProductContext ? (
          <div
            id="iq-product"
            className="flex min-h-11 items-center rounded-md border bg-gold-soft/50 px-3 py-2 text-sm text-foreground"
          >
            <span className="font-medium">{inquiryContext?.productName}</span>
            <span className="ml-2 rounded-full bg-gold/30 px-2 py-0.5 text-xs text-accent-foreground">
              from enquiry
            </span>
          </div>
        ) : (
          <>
            <Input
              id="iq-product"
              list="iq-product-list"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Personalized Family Resin Nameplate (optional)"
              maxLength={120}
              className="h-11"
            />
            {productNames.length > 0 ? (
              <datalist id="iq-product-list">
                {productNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            ) : null}
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="iq-message">Message</Label>
        <Textarea
          id="iq-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
          placeholder="Tell us about colours, names, occasion, budget or anything else (optional)"
          rows={4}
          maxLength={1000}
          aria-describedby="iq-message-count"
        />
        <p id="iq-message-count" className="text-right text-xs text-muted-foreground">
          {message.length}/1000
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Preferred contact method</legend>
        <RadioGroup
          value={preferredContact}
          onValueChange={setPreferredContact}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
            { value: "phone", label: "Phone call", icon: Phone },
          ].map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[button[data-state=checked]]:border-gold has-[button[data-state=checked]]:bg-gold-soft/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold"
              )}
            >
              <RadioGroupItem value={opt.value} id={`iq-contact-${opt.value}`} />
              <opt.icon className="size-4 text-muted-foreground" aria-hidden="true" />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <Button type="submit" disabled={submitting} className="h-12 w-full rounded-full text-base" size="lg">
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          submitLabel
        )}
      </Button>
      {/* Trust bar — quiet reassurance under the form (modal + contact page). */}
      <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground">
        <span>✦ Replies within a few hours</span>
        <span aria-hidden="true" className="opacity-40">•</span>
        <span>✦ Details stay private</span>
        <span aria-hidden="true" className="opacity-40">•</span>
        <span>✦ Made by hand in Surat</span>
      </div>
    </form>
  );
}
