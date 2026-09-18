"use client";

import { Clock, X } from "lucide-react";
import { Container } from "@/components/site/container";
import { Img } from "@/components/site/img";
import { SectionHeading } from "@/components/site/section-heading";
import { FadeIn } from "@/components/site/fade-in";
import { useAllProducts } from "@/lib/queries";
import { useSiteStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface RecentlyViewedProps {
  /** Where the strip is rendered — used for heading copy. */
  context?: "home" | "products";
  excludeSlug?: string;
  className?: string;
}

/**
 * "Recently admired" — a horizontally-scrollable strip of the last pieces the
 * visitor viewed. Persisted in localStorage, newest first, max 12 items.
 * Renders nothing until the visitor has history (and data is loaded).
 */
export function RecentlyViewed({ context = "home", excludeSlug, className }: RecentlyViewedProps) {
  const recentSlugs = useSiteStore((s) => s.recentSlugs);
  const removeRecent = useSiteStore((s) => s.removeRecent);
  const { data, isLoading } = useAllProducts();

  // The caller can exclude the currently-viewed product (product pages).
  const slugs = recentSlugs.filter((s) => s !== excludeSlug);

  const products = data?.items;
  const recentProducts = slugs
    .map((slug) => products?.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 8);

  if (isLoading && slugs.length > 0) {
    return (
      <section aria-label="Recently viewed" className={cn("py-14 md:py-16", className)}>
        <Container>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="size-40 shrink-0 animate-shimmer rounded-xl bg-secondary sm:size-48" aria-hidden="true" />
            ))}
          </div>
        </Container>
      </section>
    );
  }

  if (recentProducts.length === 0) return null;

  return (
    <section aria-label="Recently viewed" className={cn("bg-secondary/40 py-14 md:py-16", className)}>
      <Container>
        <FadeIn>
          <SectionHeading
            eyebrow="Still thinking?"
            title={context === "products" ? "Recently Viewed" : "Recently Admired by You"}
            subtext="Pick up right where you left off."
            align="center"
          />
          <div
            className="snap-x-strip flex gap-4 overflow-x-auto pb-3 custom-scroll sm:gap-5"
            role="list"
            aria-label="Recently viewed products"
          >
            {recentProducts.map((product) => (
              <a
                key={product.slug}
                href={`/product/${product.slug}`}
                role="listitem"
                className="group relative flex w-40 shrink-0 flex-col overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:w-48"
              >
                <div className="relative aspect-square overflow-hidden bg-secondary max-sm:p-2">
                  <Img
                    src={product.featuredImageUrl}
                    alt={product.featuredImageAlt || product.name}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105 max-sm:object-contain"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeRecent(product.slug);
                    }}
                    aria-label={`Remove ${product.name} from recently viewed`}
                    className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-card/85 text-foreground/60 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 hover:text-terracotta focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold group-hover:opacity-100"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                    {product.name}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    {product.categoryName}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
