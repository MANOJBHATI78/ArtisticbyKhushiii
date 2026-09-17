"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Img } from "@/components/site/img";
import { WishlistButton } from "@/components/site/wishlist-button";
import { useSiteStore } from "@/lib/store";
import type { PublicProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: PublicProduct;
  className?: string;
}

/** Catalogue card — image, category badge, name, short description, CTA row. */
export function ProductCard({ product, className }: ProductCardProps) {
  const openInquiry = useSiteStore((s) => s.openInquiry);
  const detailHref = `/product/${product.slug}`;

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden pt-0 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-xl hover:shadow-espresso/10",
        className
      )}
    >
      <a
        href={`#${detailHref}`}
        className="relative block overflow-hidden rounded-t-lg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
        aria-label={`View ${product.name}`}
      >
        <div className="aspect-[4/5] overflow-hidden bg-secondary max-sm:aspect-square max-sm:p-3">
          <Img
            src={product.featuredImageUrl}
            alt={product.featuredImageAlt || product.name}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] max-sm:object-contain max-sm:transition-none max-sm:group-hover:scale-100"
          />
        </div>
        {/* Soft warm veil on hover — depth without hiding the piece. */}
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          aria-hidden="true"
        />
        {product.categoryName ? (
          <span className="absolute left-3 top-3 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-medium text-accent-foreground shadow-sm backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-0.5">
            {product.categoryName}
          </span>
        ) : null}
      </a>

      {/* Heart — sits above the image, outside the <a> so clicking it doesn't navigate. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="pointer-events-auto flex justify-end pt-2.5 pr-2.5">
          <WishlistButton slug={product.slug} name={product.name} />
        </div>
      </div>

      <CardHeader className="pb-2">
        <a href={`#${detailHref}`} className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
          <h3 className="font-display text-lg leading-snug text-foreground transition-colors group-hover:text-primary">
            <span className="line-clamp-1">{product.name}</span>
          </h3>
        </a>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="min-h-10 text-sm text-muted-foreground line-clamp-2">{product.shortDescription}</p>
      </CardContent>

      <CardFooter className="gap-2">
        <Button asChild variant="outline" className="h-11 flex-1">
          <a href={`#${detailHref}`}>View Details</a>
        </Button>
        <Button
          className="h-11 flex-1"
          onClick={() =>
            openInquiry({
              productSlug: product.slug,
              productName: product.name,
              productUrl: detailHref,
              category: product.categoryName,
            })
          }
        >
          Enquire
        </Button>
      </CardFooter>
    </Card>
  );
}

/** Ghost link used under grids — "View all products →". */
export function ViewAllLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 flex justify-center">
      <a
        href={`#${href}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-primary transition-colors hover:text-terracotta-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {children}
        <ArrowRight className="size-4" aria-hidden="true" />
      </a>
    </div>
  );
}
