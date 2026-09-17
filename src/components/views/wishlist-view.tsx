"use client";

import { useMemo, useState } from "react";
import { HeartCrack, MessageCircle, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProductCard } from "@/components/site/product-card";
import { EmptyState } from "@/components/site/empty-state";
import { ProductGridSkeleton } from "@/components/site/skeletons";
import { FadeIn } from "@/components/site/fade-in";
import { useAllProducts } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { track } from "@/lib/track";
import { useSeo } from "@/lib/seo";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useToast } from "@/hooks/use-toast";

/**
 * Wishlist ("My Favourites") — every product the visitor hearted, in the order
 * they were saved. Persisted per-device in localStorage; never sent anywhere.
 */
export default function WishlistView() {
  const wishlistSlugs = useSiteStore((s) => s.wishlistSlugs);
  const clearWishlist = useSiteStore((s) => s.clearWishlist);
  const settings = useSiteStore((s) => s.settings);
  const { data, isLoading } = useAllProducts();
  const { toast } = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const origin = siteOrigin();

  useSeo({
    title: "My Favourites | Artistic by Khushi",
    description: "Your saved handcrafted pieces — gathered in one place so you can enquire about them together.",
    canonical: `${origin}/wishlist`,
    noindex: true,
  });

  const products = data?.items;
  const saved = useMemo(
    () =>
      wishlistSlugs
        .map((slug) => products?.find((p) => p.slug === slug))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [wishlistSlugs, products]
  );

  // Some saved slugs may no longer exist in the catalogue — count them so we can nudge the owner's heart data.
  const ghostCount = products ? wishlistSlugs.length - saved.length : 0;

  const handleClear = () => {
    track("wishlist_clear_all", { count: wishlistSlugs.length });
    clearWishlist();
    setConfirmClear(false);
    toast({ title: "Favourites cleared", description: "A clean slate — go fall in love with something new." });
  };

  const shareViaWhatsApp = () => {
    const names = saved.slice(0, 10).map((p) => `• ${p.name}`).join("\n");
    const message = `Hello! I'm interested in these pieces from Artistic by Khushi:\n\n${names}${saved.length > 10 ? `\n…+${saved.length - 10} more` : ""}\n\nPlease share details and pricing.`;
    track("wishlist_share_whatsapp", { count: saved.length });
    const url = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Container className="py-6 md:py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "My Favourites" },
        ]}
      />

      <div className="mt-6 flex flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <FadeIn>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-terracotta">Saved with love</p>
          <h1 className="font-display text-3xl leading-tight text-foreground md:text-4xl">My Favourites</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            {saved.length > 0
              ? `${saved.length} handcrafted ${saved.length === 1 ? "piece" : "pieces"} you've hearted — saved on this device, ready whenever you are.`
              : "Tap the heart on any piece to keep it here for later."}
          </p>
        </FadeIn>

        {saved.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-full text-[#128C7E] hover:bg-[#25D366]/10"
              onClick={shareViaWhatsApp}
            >
              <MessageCircle aria-hidden="true" />
              Share List on WhatsApp
            </Button>
            {confirmClear ? (
              <div className="flex items-center gap-2 rounded-full border bg-card p-1 pl-4 shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">Clear all?</span>
                <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => setConfirmClear(false)}>
                  Keep
                </Button>
                <Button variant="destructive" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={handleClear}>
                  <Trash2 className="size-3" aria-hidden="true" />
                  Clear
                </Button>
              </div>
            ) : (
              <Button variant="ghost" className="h-11 rounded-full text-muted-foreground" onClick={() => setConfirmClear(true)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Clear All
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {isLoading && wishlistSlugs.length > 0 ? (
        <ProductGridSkeleton count={4} className="mt-8" />
      ) : saved.length === 0 ? (
        <div className="mt-6 rounded-2xl border bg-card">
          <EmptyState
            icon={<HeartCrack className="size-7" aria-hidden="true" />}
            title="Nothing saved yet"
            message="Browse the catalogue and tap the little heart on any piece — it will wait for you right here, on this device."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button className="h-11" onClick={() => navigate("/products")}>
                  <Sparkles className="size-4" aria-hidden="true" />
                  Explore the Catalogue
                </Button>
                <Button variant="outline" className="h-11" onClick={() => navigate("/categories")}>
                  Shop by Collection
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <FadeIn delay={0.1}>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {saved.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </FadeIn>
      )}

      {ghostCount > 0 ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {ghostCount} saved {ghostCount === 1 ? "piece" : "pieces"} {ghostCount === 1 ? "is" : "are"} no longer in the catalogue.
        </p>
      ) : null}
    </Container>
  );
}
