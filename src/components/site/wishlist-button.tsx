"use client";

import { Heart } from "lucide-react";
import { useSiteStore } from "@/lib/store";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  slug: string;
  name: string;
  variant?: "floating" | "inline";
  className?: string;
}

/**
 * Heart toggle — adds/removes a product from the visitor's wishlist
 * (persisted in localStorage). Two looks:
 *  - "floating": glassy pill pinned over a product-card image corner
 *  - "inline":   solid button used on the product detail page
 */
export function WishlistButton({ slug, name, variant = "floating", className }: WishlistButtonProps) {
  const wishlisted = useSiteStore((s) => s.wishlistSlugs.includes(slug));
  const toggleWishlist = useSiteStore((s) => s.toggleWishlist);

  const handleToggle = () => {
    const next = !wishlisted;
    toggleWishlist(slug);
    track(next ? "wishlist_add" : "wishlist_remove", { product: slug });
  };

  const label = wishlisted ? `Remove ${name} from favourites` : `Save ${name} to favourites`;

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={wishlisted}
        aria-label={label}
        title={wishlisted ? "Remove from favourites" : "Save to favourites"}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          wishlisted
            ? "border-terracotta/40 bg-terracotta/10 text-terracotta-deep hover:bg-terracotta/20"
            : "border-border bg-card text-foreground/80 hover:border-terracotta/40 hover:text-terracotta",
          className
        )}
      >
        <Heart
          className={cn("size-4 transition-transform duration-300", wishlisted && "scale-110 fill-terracotta text-terracotta")}
          aria-hidden="true"
        />
        {wishlisted ? "Saved to Favourites" : "Save to Favourites"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={wishlisted}
      aria-label={label}
      title={wishlisted ? "Remove from favourites" : "Save to favourites"}
      className={cn(
        "absolute right-2.5 top-2.5 z-10 flex size-9 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        wishlisted
          ? "bg-terracotta/95 text-white shadow-md"
          : "bg-card/85 text-foreground/70 shadow-sm hover:bg-card hover:text-terracotta",
        className
      )}
    >
      <Heart
        className={cn(
          "size-4.5 transition-all duration-300 motion-safe:animate-[heart-pop_0.35s_ease-out]",
          wishlisted ? "scale-110 fill-white" : "scale-100"
        )}
        aria-hidden="true"
      />
      {wishlisted ? (
        <span className="sr-only">Saved</span>
      ) : null}
    </button>
  );
}
