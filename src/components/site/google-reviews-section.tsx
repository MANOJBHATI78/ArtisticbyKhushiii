"use client";

import { ExternalLink, PenLine } from "lucide-react";
import { useGoogleReviews } from "@/lib/queries";
import { Container } from "@/components/site/container";
import { FadeIn } from "@/components/site/fade-in";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";

/** Inline Google "G" mark (four-colour). */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            d="M12 2l2.92 6.26 6.87.63-5.17 4.55 1.52 6.71L12 16.7l-6.14 3.45 1.52-6.71L2.21 8.89l6.87-.63L12 2z"
            fill={i <= Math.round(value) ? "#F59E0B" : "currentColor"}
            className={i <= Math.round(value) ? "" : "opacity-20"}
          />
        </svg>
      ))}
    </span>
  );
}

interface GoogleReviewsSectionProps {
  /** "full" = the homepage look (unchanged). "compact" = tighter strip for product/about/contact pages. */
  variant?: "full" | "compact";
  /** Max review cards shown (defaults to 6 full / 3 compact). */
  limit?: number;
}

/**
 * Real Google Business Profile reviews — shown on the homepage between the
 * studio testimonials and the final CTA, and in a compact strip on product,
 * about and contact pages. Self-hides until the owner configures the Places
 * API key + place id in Site Settings, so adding it anywhere is zero-risk.
 */
export function GoogleReviewsSection({ variant = "full", limit }: GoogleReviewsSectionProps) {
  const { data, isLoading } = useGoogleReviews();
  const compact = variant === "compact";
  const maxReviews = limit ?? (compact ? 3 : 6);

  if (isLoading || !data || !data.configured || !data.reviews || data.reviews.length === 0) return null;

  return (
    <section aria-label="Google reviews" className={cn("bg-secondary/40", compact ? "py-12" : "py-14 md:py-20")}>
      <Container>
        <FadeIn>
          <SectionHeading
            eyebrow="Straight from Google"
            title="Loved on Google"
            className={compact ? "mb-6 md:mb-8 [&_h2]:text-2xl md:[&_h2]:text-3xl" : undefined}
          />
        </FadeIn>

        {/* Rating summary strip */}
        <FadeIn
          className={cn(
            "flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5",
            compact ? "mt-6" : "mt-8"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 rounded-full border border-gold/30 bg-card shadow-sm",
              compact ? "px-4 py-2" : "px-5 py-2.5"
            )}
          >
            <GoogleG className={compact ? "size-5" : "size-6"} />
            <span
              className={cn(
                "font-display leading-none font-semibold text-foreground",
                compact ? "text-2xl" : "text-3xl"
              )}
            >
              {(data.rating ?? 5).toFixed(1)}
            </span>
            <Stars value={data.rating ?? 5} />
            <span className="text-sm text-muted-foreground">
              {(data.total ?? data.reviews.length).toLocaleString("en-IN")} Google reviews
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {data.mapsUrl ? (
              <a
                href={data.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition-all hover:border-gold/50 hover:text-primary hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <ExternalLink className="size-4" aria-hidden="true" /> See all on Google
              </a>
            ) : null}
            {!compact && data.writeReviewUrl ? (
              <a
                href={data.writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <PenLine className="size-4" aria-hidden="true" /> Write a Google review
              </a>
            ) : null}
          </div>
        </FadeIn>

        {/* Review cards */}
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            compact ? "mt-6 gap-4" : "mt-10 gap-5"
          )}
        >
          {data.reviews.slice(0, maxReviews).map((r, i) => (
            <FadeIn key={`${r.author}-${i}`} delay={Math.min(i * 60, 240)}>
              <figure
                className={cn(
                  "flex h-full flex-col rounded-2xl border border-cream/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md",
                  compact ? "p-4" : "p-5"
                )}
              >
                <div className="flex items-center gap-3">
                  {r.photo ? (
                    <img
                      src={r.photo}
                      alt={`${r.author} — Google profile photo`}
                      loading="lazy"
                      className={compact ? "size-9 rounded-full object-cover" : "size-10 rounded-full object-cover"}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex items-center justify-center rounded-full bg-gold-soft font-display text-sm font-semibold text-espresso",
                        compact ? "size-9" : "size-10"
                      )}
                    >
                      {r.author.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{r.author}</p>
                    <p className="text-xs text-muted-foreground">{r.when ? `${r.when} · Google` : "Google review"}</p>
                  </div>
                  <GoogleG className="ml-auto size-4 shrink-0 opacity-80" />
                </div>
                <Stars value={r.rating} className="mt-3" />
                <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-foreground/80">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
              </figure>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
