"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FadeIn } from "@/components/site/fade-in";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { siteOrigin } from "@/components/site/seo-helpers";
import { usePage } from "@/lib/queries";
import { useSiteStore } from "@/lib/store";
import { useSeo } from "@/lib/seo";

export default function ServicesView() {
  const { data: page, isLoading, isError, refetch } = usePage("services");
  const openInquiry = useSiteStore((s) => s.openInquiry);
  const origin = siteOrigin();

  useSeo({
    title: page?.seoTitle || "Our Services | Artistic by Khushiii",
    description:
      page?.metaDescription ||
      "Custom resin art commissions, memory preservation, bulk & corporate gifting and worldwide shipping — services offered by Artistic by Khushiii.",
    canonical: `${origin}/services`,
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
      <Container className="py-8 md:py-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Services" }]} />
        <FadeIn>
          <h1 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-5xl">
            {page?.title || "Our Services"}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            From one-of-a-kind commissions to keepsakes that hold your memories — here&apos;s how we can craft for you.
          </p>
        </FadeIn>

        <div className="mt-8">
          {isLoading ? (
            <div className="max-w-3xl space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : page?.content ? (
            <div className="prose-content max-w-3xl" dangerouslySetInnerHTML={{ __html: page.content }} />
          ) : (
            <EmptyState title="Services page coming soon" message="Ask us directly — we reply within a few hours." />
          )}
        </div>
      </Container>

      {/* CTA band */}
      <section aria-label="Start a commission" className="bg-espresso py-16 md:py-20">
        <Container className="text-center">
          <FadeIn>
            <h2 className="font-display text-3xl text-cream md:text-4xl">Ready to commission your piece?</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-cream/80">
              Share your idea, occasion and budget — we&apos;ll design it together.
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
