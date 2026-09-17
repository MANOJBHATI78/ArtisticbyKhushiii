"use client";

import { MapPin, Quote, Star } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { FadeIn } from "@/components/site/fade-in";
import { Img } from "@/components/site/img";
import { useTestimonials } from "@/lib/queries";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Gold star row — filled count = rating. */
function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("size-4", i < rating ? "fill-gold text-gold" : "text-border")}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/** Avatar circle — customer photo when available, warm initials otherwise. */
function Avatar({ t }: { t: Testimonial }) {
  const initials = t.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (t.avatarUrl) {
    return (
      <Img
        src={t.avatarUrl}
        alt={`${t.name}'s photo`}
        className="size-11 shrink-0 rounded-full border-2 border-gold-soft object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-gold-soft bg-secondary font-display text-sm font-semibold text-terracotta-deep"
    >
      {initials || "♥"}
    </span>
  );
}

/**
 * "Words from Happy Hearts" — customer testimonials in an elegant grid.
 * Admin-managed (Testimonials module); the section hides itself entirely
 * when no published testimonials exist.
 */
export function TestimonialsSection({ className }: { className?: string }) {
  const { data: testimonials, isLoading } = useTestimonials(6);

  if (isLoading) {
    return (
      <section aria-label="Customer testimonials" className={cn("py-16 md:py-24", className)}>
        <Container>
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 animate-shimmer rounded-2xl bg-secondary" aria-hidden="true" />
            ))}
          </div>
        </Container>
      </section>
    );
  }

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section aria-label="Customer testimonials" className={cn("bg-secondary/50 py-16 md:py-24", className)}>
      <Container>
        <FadeIn>
          <SectionHeading
            eyebrow="Words from happy hearts"
            title="Loved by Customers Everywhere"
            subtext="Real notes from real people who gifted (or kept) a handmade piece."
          />
        </FadeIn>

        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <FadeIn key={t.id} delay={Math.min(i, 5) * 0.08} y={16} duration={0.5}>
              <figure className="group relative flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg">
                {/* Oversized quote mark — editorial flourish. */}
                <Quote
                  className="absolute right-5 top-4 size-8 text-gold-soft transition-colors duration-300 group-hover:text-gold/50"
                  aria-hidden="true"
                />
                <Stars rating={t.rating} />
                <blockquote className="mt-3 flex-1">
                  <p className="text-sm leading-relaxed text-foreground/85">“{t.quote}”</p>
                </blockquote>
                {t.productName ? (
                  <figcaption className="mt-4">
                    <span className="inline-block rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                      {t.productName}
                    </span>
                  </figcaption>
                ) : null}
                <div className="mt-4 flex items-center gap-3 border-t border-border/70 pt-4">
                  <Avatar t={t} />
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
  );
}
