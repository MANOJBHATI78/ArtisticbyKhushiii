"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, PenLine, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";
import { FadeIn } from "@/components/site/fade-in";
import { Img } from "@/components/site/img";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Testimonial } from "@/lib/types";
import { ReviewFormDialog } from "@/components/site/review-form";
import { cn } from "@/lib/utils";

// ============================================================
// "Reviews for this piece" — per-product social proof.
// Shows testimonials whose "about which piece" matches this
// product first, then general studio love notes to fill the row.
// Includes an aggregate rating summary + "write a review" CTA.
// ============================================================

/** Per-product testimonial fetch — piece matches first, general notes fill up.
 *  Shared with ProductView's JSON-LD (same query key → cached, no double fetch). */
export function useProductTestimonials(productName: string) {
  return useQuery<Testimonial[]>({
    queryKey: ["testimonials", "product", productName] as const,
    queryFn: () => api.get<Testimonial[]>(`/api/public/testimonials?product=${encodeURIComponent(productName)}&limit=6`),
    enabled: !!productName,
    staleTime: 1000 * 60 * 5,
  });
}

export function ProductTestimonials({ productName, className }: { productName: string; className?: string }) {
  const { data: testimonials, isLoading } = useProductTestimonials(productName);
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading) {
    return (
      <section aria-label="Customer reviews" className={cn("py-14 md:py-20", className)}>
        <Container>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        </Container>
      </section>
    );
  }

  if (!testimonials || testimonials.length === 0) {
    // No reviews yet — still offer the "be the first" CTA (compact, elegant).
    return (
      <>
        <section aria-label="Customer reviews" className={cn("py-14 md:py-20", className)}>
          <Container>
            <FadeIn>
              <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft">
                  <PenLine className="size-5 text-gold" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-2xl text-foreground">Be the first to review this piece</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ordered something like it? Your experience helps other gift-lovers choose with confidence.
                  </p>
                </div>
                <Button variant="outline" className="h-11 rounded-full px-6" onClick={() => setFormOpen(true)}>
                  <PenLine className="mr-1.5 size-4" aria-hidden="true" />
                  Write a Review
                </Button>
              </div>
            </FadeIn>
          </Container>
        </section>
        <ReviewFormDialog open={formOpen} onOpenChange={setFormOpen} productName={productName} context="product" />
      </>
    );
  }

  // Aggregate rating over the visible reviews.
  const avg = testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length;
  const avgRounded = Math.round(avg * 10) / 10;
  const forPiece = testimonials.filter((t) => t.productName);
  const heading = forPiece.length > 0 ? "Reviews for this Piece" : "What Customers Say";

  return (
    <>
      <section aria-label="Customer reviews" className={cn("bg-secondary/50 py-14 md:py-20", className)}>
        <Container>
          <FadeIn>
            {/* Heading + aggregate rating summary */}
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">Happy hearts</p>
                <h2 className="mt-1 font-display text-3xl leading-tight text-foreground md:text-4xl">{heading}</h2>
                <div className="mt-3 flex" aria-hidden="true">
                  <span className="ornament-divider">
                    <span className="diamond animate-gold-shimmer" />
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2.5" aria-label={`Average rating ${avgRounded} out of 5 stars`}>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-4",
                          i < Math.round(avg) ? "fill-gold text-gold" : "text-border"
                        )}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{avgRounded}</span>
                  <span className="text-sm text-muted-foreground">· {testimonials.length} review{testimonials.length > 1 ? "s" : ""}</span>
                </div>
              </div>
              <Button variant="outline" className="h-11 shrink-0 rounded-full px-6" onClick={() => setFormOpen(true)}>
                <PenLine className="mr-1.5 size-4" aria-hidden="true" />
                Write a Review
              </Button>
            </div>
          </FadeIn>

          {/* Review cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            {testimonials.slice(0, 6).map((t, i) => (
              <FadeIn key={t.id} delay={Math.min(i, 5) * 0.08} y={16} duration={0.5}>
                <figure className="group relative flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg">
                  <Quote
                    className="absolute right-5 top-4 size-8 text-gold-soft transition-colors duration-300 group-hover:text-gold/50"
                    aria-hidden="true"
                  />
                  <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${t.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={cn("size-4", s < t.rating ? "fill-gold text-gold" : "text-border")}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                  <blockquote className="mt-3 flex-1">
                    <p className="text-sm leading-relaxed text-foreground/85">“{t.quote}”</p>
                  </blockquote>
                  <div className="mt-4 flex items-center gap-3 border-t border-border/70 pt-4">
                    {t.avatarUrl ? (
                      <Img
                        src={t.avatarUrl}
                        alt={`${t.name}'s photo`}
                        className="size-11 shrink-0 rounded-full border-2 border-gold-soft object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-gold-soft bg-secondary font-display text-sm font-semibold text-terracotta-deep"
                      >
                        {t.name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "♥"}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                      {t.location ? (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" aria-hidden="true" />
                          {t.location}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </figure>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>
      <ReviewFormDialog open={formOpen} onOpenChange={setFormOpen} productName={productName} context="product" />
    </>
  );
}
