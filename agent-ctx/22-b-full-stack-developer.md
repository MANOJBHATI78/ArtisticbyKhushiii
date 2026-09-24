# Task 22-b — Public UI round (lead gate + prices + Google reviews)

Task: WhatsApp/call lead gate, product price display (₹ + struck MRP + JSON-LD offers), Google reviews compact variant on product/about/contact. All backend pre-existing and tested; public-site frontend only.

## What was built

1. **WhatsApp / call lead gate**
   - `src/lib/store.ts` (additive): `leadGate` slice — `{ open, href, kind: "whatsapp"|"call", product, productUrl, category }` + `openLeadGate(href, kind, ctx?)` / `closeLeadGate()`; exported `LeadGateContext` / `LeadGateState`.
   - `src/components/site/lead-gate.tsx` (new): `LeadGateDialog` — brand-styled dialog (terracotta/gold/cream, gradient strip, `MessageCircleHeart`/`PhoneCall` in gold circle, font-display heading per kind, privacy microcopy, product chip, honeypot `name="website"`). Name 2–80 + Indian mobile validation (same regex as inquiry-form), inline errors, first-empty-field focus, Escape/Cancel close. `abk_contact_profile` localStorage prefill on every open (inner `GateForm` mounts fresh — Radix unmounts content on close), saved back on submit. Submit: navigate FIRST synchronously (`window.open(href, "_blank", "noopener")` / `window.location.href = tel`), then `lead_gate_submit` GA event + close, then fire-and-forget `POST /api/public/click-lead`. API errors: `console.warn` only.
   - `src/components/site/site-app.tsx`: `useLeadGateInterceptor()` — document **capture-phase** click listener; regex `/^https:\/\/wa\.me\/\d+/` (share links `wa.me/?text=` skipped) + `tel:` prefix; modifier-clicks ignored; `preventDefault + stopPropagation + openLeadGate(...)` with ctx from `a.dataset.leadProduct/leadProductUrl/leadCategory`; cleanup on unmount. `<LeadGateDialog />` mounted in SiteShell.
   - `src/lib/track.ts` (additive): `trackLeadGateOpen` / `trackLeadGateSubmit`.
   - Data attributes on WhatsApp CTAs (hero + final CTA) and the Call CTA of `product-view.tsx`, and the WhatsApp link in `product-sticky-cta.tsx`. Hrefs untouched.

2. **Price display**
   - `src/lib/format.ts` (new): `formatINR` (en-IN → "₹1,499"), `hasPrice`, `hasDiscount` (compareAt strictly > price), `priceValue`.
   - `product-card.tsx` + `quick-view.tsx`: price line under title (font-semibold `text-espresso` + struck muted compareAt); nothing when unpriced.
   - `product-view.tsx` hero: `text-3xl font-display` price + struck MRP; Product JSON-LD gains `offers: { Offer, url, priceCurrency: "INR", price: digits, InStock, NewCondition }` when priced.

3. **Google reviews everywhere**
   - `google-reviews-section.tsx`: `{ variant?: "full" | "compact"; limit? }` — default full renders exactly as before (6 cards); compact = smaller heading, py-12, ≤3 cards, keeps G mark + rating pill + "See all on Google"; self-hide logic unchanged. (Removed dead `description` prop on SectionHeading — pre-existing tsc error, rendered look unchanged.)
   - `<GoogleReviewsSection variant="compact" />` on product (after testimonials, before final CTA), about (before CTA band), contact (end of page).

## Verification

- ESLint `src/components/site/** src/components/views/** src/lib/store.ts src/lib/track.ts src/lib/format.ts` → 0 problems.
- `bunx tsc --noEmit` → 18 errors, ALL pre-existing in other agents' files (baseline was 19; I fixed the google-reviews one). Zero in my files.
- dev.log clean; all public routes 200.
- agent-browser QA: float/product WhatsApp + product Call taps gate with product chip; header/footer links gate; share-row `wa.me/?text=` NOT gated; modifier-click skips; empty submit → errors + focus; prefill + one-tap resubmit; wa.me opens in NEW tab (current tab stays), tel: keeps page; leads land with kind/product/productUrl/category/sourcePage; 30-min dedupe confirmed; JSON-LD offers verified (₹1,499/₹1,999 struck; 499 vs 399 → no strike); 375px dialog 343px wide, stacked fields, 48px CTA, no h-scroll; desktop 448px centered; 0 console errors.
- **Bug found & fixed during QA**: `window.open(..., "noopener")` returns `null` by spec — an initial "popup blocked → location.href" fallback made the current tab ALSO navigate to WhatsApp. Fallback removed.
- All QA data reverted (temporary prices cleared, 5 test leads deleted).

## Notes for QA agent

- Gated anchors' own `whatsapp_click`/`call_click` onClick GA handlers no longer fire (capture-phase stopPropagation) — `lead_gate_open/submit` + the click-lead DB row are the record now.
- Wishlist "Share List on WhatsApp" (programmatic `window.open`, not an anchor) intentionally NOT gated per task scope.
- Prices are admin-managed strings; empty = enquiry-only look unchanged everywhere, incl. JSON-LD (no offers block).
- Google reviews compact self-hides until `googlePlacesApiKey` + `googlePlaceId` are set.
