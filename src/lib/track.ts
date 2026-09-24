/**
 * GA4 event tracking helper for the public site.
 *
 * `window.gtag` is injected by `<SiteAnalytics />` (src/components/site/analytics.tsx)
 * only when a valid GA measurement ID is saved in admin settings — so on localhost
 * dev, or when GA is not configured, `track()` is a silent no-op.
 *
 * Event names follow GA conventions (snake_case, ≤40 chars, start with a letter);
 * param values should stay ≤100 chars.
 */

declare global {
  interface Window {
    /**
     * Merged with the identical declaration in src/components/site/analytics.tsx —
     * TypeScript interface merging allows duplicate members only when the types
     * match exactly, so keep this signature in sync.
     */
    gtag?: (...args: unknown[]) => void;
  }
}

export type TrackParams = Record<string, unknown>;

/** Known engagement locations for whatsapp_click / call_click. */
export type ContactLocation = "float" | "product" | "footer" | "header" | "contact" | "home";

/**
 * Fire a GA4 event. Safely no-ops (never throws, never blocks the UI) when
 * `window.gtag` is undefined or analytics is disabled.
 */
export function track(event: string, params?: TrackParams): void {
  try {
    window.gtag?.("event", event, params ?? {});
  } catch {
    /* analytics must never break the UX */
  }
}

/** `whatsapp_click` — fired from every WhatsApp entry point. */
export function trackWhatsAppClick(location: ContactLocation, productSlug?: string): void {
  track("whatsapp_click", {
    location,
    ...(productSlug ? { product_slug: productSlug } : {}),
  });
}

/** `call_click` — fired from every tel: entry point. */
export function trackCallClick(location: ContactLocation): void {
  track("call_click", { location });
}

/** `share_click` — fired from every social share entry point. */
export function trackShareClick(network: ShareNetwork, context: string): void {
  track("share_click", { network, context });
}

/** Social networks offered by <ShareRow />. */
export type ShareNetwork = "whatsapp" | "facebook" | "pinterest" | "x" | "copy";

/** `inquiry_open` — fired when the global enquiry dialog opens. */
export function trackInquiryOpen(context: string, productSlug?: string, category?: string): void {
  track("inquiry_open", {
    context,
    ...(productSlug ? { product_slug: productSlug } : {}),
    ...(category ? { category } : {}),
  });
}

/** `inquiry_submit` — fired ONLY after a lead is successfully saved. */
export function trackInquirySubmit(params: {
  product?: string;
  category?: string;
  sourcePage?: string;
}): void {
  track("inquiry_submit", {
    success: true,
    product: params.product || "",
    category: params.category || "",
    source_page: params.sourcePage || "",
  });
}

/** `lead_gate_open` — fired when the WhatsApp/call gate dialog opens. */
export function trackLeadGateOpen(kind: "whatsapp" | "call"): void {
  track("lead_gate_open", { kind });
}

/** `lead_gate_submit` — fired when the visitor passes the WhatsApp/call gate. */
export function trackLeadGateSubmit(kind: "whatsapp" | "call"): void {
  track("lead_gate_submit", { kind });
}
