"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicProduct } from "@/lib/types";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { trackWhatsAppClick } from "@/lib/track";

interface ProductStickyCtaProps {
  product: PublicProduct;
}

/**
 * Mobile-only sticky action bar for product pages — the piece's name and a
 * one-tap Enquire / WhatsApp row follow the visitor as they scroll long
 * descriptions, specs and FAQs. Hidden on ≥sm screens; leaves room for the
 * floating WhatsApp button on the right.
 */
export function ProductStickyCta({ product }: ProductStickyCtaProps) {
  const settings = useSiteStore((s) => s.settings);
  const openInquiry = useSiteStore((s) => s.openInquiry);

  return (
    <>
      {/* Spacer so the bar never covers real content or the footer. */}
      <div className="h-20 sm:hidden" aria-hidden="true" />

      <div
        className="print-hide fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:hidden"
        role="complementary"
        aria-label="Quick actions"
      >
        <div className="flex items-center gap-2.5 p-3 pr-20">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight text-foreground">{product.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.categoryName || "Handcrafted"} · made to order
            </p>
          </div>
          <Button
            className="h-11 min-h-11 shrink-0 rounded-full px-5"
            onClick={() =>
              openInquiry({
                productSlug: product.slug,
                productName: product.name,
                productUrl: `/product/${product.slug}`,
                category: product.categoryName,
              })
            }
          >
            Enquire
          </Button>
          <a
            href={whatsappLink(settings, product.name)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick("product", product.slug)}
            aria-label={`Ask about ${product.name} on WhatsApp`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition-transform hover:scale-105"
          >
            <MessageCircle className="size-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </>
  );
}
