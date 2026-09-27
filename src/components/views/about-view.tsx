"use client";

import { useMemo } from "react";
import { Gem, HandHeart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Img } from "@/components/site/img";
import { FadeIn } from "@/components/site/fade-in";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { GoogleReviewsSection } from "@/components/site/google-reviews-section";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useHome, usePage } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { useSiteStore } from "@/lib/store";
import { parseJsonArray } from "@/lib/types";
import { useSeo } from "@/lib/seo";

const VALUE_ICONS = [Sparkles, Gem, HandHeart];

export default function AboutView() {
  const { data: page, isLoading, isError, refetch } = usePage("about");
  const { data: home } = useHome();
  const openInquiry = useSiteStore((s) => s.openInquiry);
  const origin = siteOrigin();

  const values = useMemo(
    () => parseJsonArray(home?.brandIntro?.itemsJson).filter(
      (item): item is { title?: string; text?: string } => typeof item === "object" && item !== null
    ),
    [home?.brandIntro?.itemsJson]
  );

  useSeo({
    title: page?.seoTitle || "About Us | Artistic by Khushiii",
    description:
      page?.metaDescription ||
      "The story of Artistic by Khushiii — a small-batch resin art studio from Surat crafting personalized nameplates, décor and memory keepsakes by hand.",
    canonical: `${origin}/about`,
  });

  if (isError) {
    return (
      <Container className="py-16">
        <ErrorState onRetry={() => refetch()} />
      </Container>
    );
  }

  return (
    <>
      {/* Hero band */}
      <section aria-label="About Artistic by Khushiii" className="bg-secondary/50 py-12 md:py-16">
        <Container>
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
          <div className="mt-4 grid items-center gap-8 lg:grid-cols-2">
            <FadeIn>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-terracotta">Our story</p>
              <h1 className="font-display text-3xl leading-tight text-foreground md:text-5xl">
                {page?.title || "About Artistic by Khushiii"}
              </h1>
              <p className="mt-4 max-w-xl text-base text-foreground/80 md:text-lg">
                A one-woman resin art studio from Surat — where wedding bouquets, family names and little
                memories become heirlooms, one hand-poured piece at a time.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" className="h-12 rounded-full px-7" onClick={() => openInquiry(null)}>
                  Enquire Now
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-full px-7" onClick={() => navigate("/products")}>
                  See Our Work
                </Button>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="overflow-hidden rounded-2xl shadow-md">
                <Img
                  src={home?.brandIntro?.imageUrl || "/images/about-studio.jpg"}
                  alt="Khushi crafting resin art in her Surat studio"
                  eager
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </FadeIn>
          </div>
        </Container>
      </section>

      {/* Page content */}
      <Container className="py-12 md:py-16">
        {isLoading ? (
          <div className="mx-auto max-w-3xl space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : page?.content ? (
          <FadeIn>
            <div className="prose-content mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: page.content }} />
          </FadeIn>
        ) : (
          !isError && <EmptyState title="Our story is being written" message="Check back soon — or say hello on WhatsApp!" />
        )}
      </Container>

      {/* Values */}
      {values.length > 0 ? (
        <section aria-label="What we stand for" className="bg-secondary/50 py-12 md:py-16">
          <Container>
            <FadeIn>
              <h2 className="text-center font-display text-3xl text-foreground md:text-4xl">What We Stand For</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-3 md:gap-6">
                {values.map((value, i) => {
                  const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
                  return (
                    <div key={i} className="rounded-xl border bg-card p-6 text-center">
                      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-gold-soft text-terracotta">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 font-medium text-foreground">{value.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground">{value.text}</p>
                    </div>
                  );
                })}
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Real Google reviews — self-hides until the owner connects the Places API. */}
      <GoogleReviewsSection variant="compact" />

      {/* CTA band */}
      <section aria-label="Get in touch" className="bg-espresso py-16 md:py-20">
        <Container className="text-center">
          <FadeIn>
            <h2 className="font-display text-3xl text-cream md:text-4xl">Let&apos;s make something beautiful</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-cream/80">
              Custom orders are our love language — tell us your idea and we&apos;ll bring it to life in resin.
            </p>
            <Button
              size="lg"
              className="mt-6 h-12 rounded-full bg-gold px-8 text-base text-espresso hover:bg-gold/90"
              onClick={() => openInquiry(null)}
            >
              Send an Inquiry
            </Button>
          </FadeIn>
        </Container>
      </section>
    </>
  );
}
