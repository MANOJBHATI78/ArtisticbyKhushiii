/**
 * Indian-rupee price formatting for public product surfaces.
 *
 * Prices are stored as plain strings (often just digits, e.g. "1499" or
 * "₹1,499") — everything non-numeric is stripped before formatting so the
 * display and the Product JSON-LD always receive clean values.
 */

/** Digits-only value of a price string (0 when empty/invalid). */
export function priceValue(raw: string | null | undefined): number {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Formats a price string as a pretty Indian-rupee amount — "1499" → "₹1,499".
 * Returns "" for empty/invalid input so callers can render nothing at all
 * (enquiry-only products keep their previous look).
 */
export function formatINR(v: string | null | undefined): string {
  const n = priceValue(v);
  if (!n) return "";
  return `₹${new Intl.NumberFormat("en-IN").format(n)}`;
}

/** True when the product carries a sellable price. */
export function hasPrice(p: { price?: string | null }): boolean {
  return priceValue(p.price) > 0;
}

/** True when compareAtPrice is a valid number strictly above price (a visible discount). */
export function hasDiscount(p: { price?: string | null; compareAtPrice?: string | null }): boolean {
  const price = priceValue(p.price);
  const compare = priceValue(p.compareAtPrice);
  return price > 0 && compare > price;
}
