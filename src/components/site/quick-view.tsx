"use client";

import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Img } from "@/components/site/img";
import { useProduct } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { useSiteStore } from "@/lib/store";
import { splitList } from "@/lib/types";
import { track } from "@/lib/track";

interface QuickViewProps {
  /** Product slug — the query is cached so repeat opens are instant. */
  slug: string | null;
  onClose: () => void;
}

/**
 * Fast product preview straight from a catalogue card — image, highlights and
 * CTAs without leaving the grid. "View Full Details" continues to the product
 * page; "Enquire" opens the global inquiry modal with the product context.
 */
export function QuickView({ slug, onClose }: QuickViewProps) {
  const open = Boolean(slug);
  const openInquiry = useSiteStore((s) => s.openInquiry);
  const { data, isLoading, isError } = useProduct(slug ?? "");

  useEffect(() => {
    if (slug) track("quick_view_open", { product: slug });
  }, [slug]);

  const product = data?.product;

  const goFullDetails = () => {
    if (!product) return;
    track("quick_view_full_details", { product: product.slug });
    onClose();
    navigate(`/product/${product.slug}`);
  };

  const enquire = () => {
    if (!product) return;
    track("quick_view_enquire", { product: product.slug });
    onClose();
    openInquiry({
      productSlug: product.slug,
      productName: product.name,
      productUrl: `/product/${product.slug}`,
      category: product.categoryName,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent
        className="max-h-[92vh] max-w-[min(94vw,900px)] gap-0 overflow-y-auto border-border/60 p-0 sm:rounded-2xl custom-scroll"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 p-10 text-muted-foreground">
            <Loader2 className="size-7 animate-spin text-gold" aria-hidden="true" />
            <p className="text-sm">Fetching this piece…</p>
          </div>
        ) : isError || !product ? (
          <div className="flex min-h-[35vh] flex-col items-center justify-center gap-3 p-10 text-center">
            <p className="font-display text-lg text-foreground">Couldn&apos;t load this piece</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Please close this and open the full product page instead.
            </p>
          </div>
        ) : (
          <>
            <DialogTitle className="sr-only">Quick view — {product.name}</DialogTitle>
            <div className="grid gap-0 sm:grid-cols-2">
              {/* Image column */}
              <div className="relative bg-secondary max-sm:max-h-[38vh] max-sm:overflow-hidden">
                <div className="aspect-square size-full max-sm:mx-auto max-sm:max-h-[38vh] max-sm:w-auto max-sm:p-3">
                  <Img
                    src={product.featuredImageUrl}
                    alt={product.featuredImageAlt || product.name}
                    eager
                    className="size-full object-cover max-sm:object-contain"
                  />
                </div>
                {product.categoryName ? (
                  <span className="absolute left-3 top-3 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-medium text-accent-foreground shadow-sm backdrop-blur-sm">
                    {product.categoryName}
                  </span>
                ) : null}
              </div>

              {/* Details column */}
              <div className="flex flex-col gap-4 p-5 sm:p-7">
                <div>
                  <h2 className="font-display text-2xl leading-snug text-foreground">{product.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.shortDescription}</p>
                </div>

                {(() => {
                  const highlights = splitList(product.highlights).slice(0, 4);
                  if (highlights.length === 0) return null;
                  return (
                    <ul className="space-y-2" aria-label="Highlights">
                      {highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
                          <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-gold" aria-hidden="true" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  );
                })()}

                {product.material || product.occasion ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {product.material ? (
                      <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{product.material}</span>
                    ) : null}
                    {product.occasion ? (
                      <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{product.occasion}</span>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-auto flex flex-col gap-2.5 pt-2 sm:flex-row">
                  <Button className="h-11 flex-1 rounded-full" onClick={enquire}>
                    Enquire Now
                  </Button>
                  <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={goFullDetails}>
                    Full Details
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Made to order · pan-India & worldwide delivery
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
