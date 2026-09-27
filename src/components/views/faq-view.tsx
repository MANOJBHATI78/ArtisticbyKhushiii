"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { FadeIn } from "@/components/site/fade-in";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useFaqs } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { useSeo } from "@/lib/seo";

export default function FaqView() {
  const { data: faqs, isLoading, isError, refetch } = useFaqs();
  const [filter, setFilter] = useState("");
  const settings = useSiteStore((s) => s.settings);
  const origin = siteOrigin();

  const allFaqs = faqs || [];
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allFaqs;
    return allFaqs.filter(
      (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    );
  }, [allFaqs, filter]);

  useSeo({
    title: "FAQ | Artistic by Khushiii — Frequently Asked Questions",
    description:
      "Answers about ordering, customization, delivery timelines, care instructions and international shipping for handcrafted resin art by Artistic by Khushiii.",
    canonical: `${origin}/faq`,
    jsonLd: useMemo(() => {
      if (allFaqs.length === 0) return undefined;
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: allFaqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      };
    }, [allFaqs]),
  });

  return (
    <>
      <Container className="py-8 md:py-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />

        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-3xl leading-tight text-foreground md:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Everything about ordering, customization, delivery and caring for your resin art.
            </p>
            <div className="relative mx-auto mt-6 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search questions…"
                aria-label="Search frequently asked questions"
                className="h-11 pl-9"
              />
            </div>
          </div>
        </FadeIn>

        <div className="mx-auto mt-10 max-w-3xl">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-secondary animate-shimmer" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={filter ? "No matching questions" : "Questions coming soon"}
              message={
                filter
                  ? `Nothing matched "${filter}". Try another word — or simply ask us directly.`
                  : "Ask us anything on WhatsApp — we reply within a few hours."
              }
              icon={<MessageCircle className="size-7" aria-hidden="true" />}
              action={
                <Button variant="outline" className="h-11" asChild>
                  <a href={whatsappLink(settings)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" />
                    Ask on WhatsApp
                  </a>
                </Button>
              }
            />
          ) : (
            <div className="rounded-2xl border bg-card px-4 py-2 md:px-6">
              <FaqAccordion faqs={filtered} />
            </div>
          )}
        </div>
      </Container>

      {/* Still have questions */}
      <section aria-label="Still have questions" className="bg-secondary/50 py-14 md:py-18">
        <Container className="text-center">
          <FadeIn>
            <h2 className="font-display text-3xl text-foreground md:text-4xl">Still Have Questions?</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              We&apos;re happy to help — chat with us or drop your question via the contact page.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="h-12 rounded-full px-7" asChild>
                <a href={whatsappLink(settings)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  Chat on WhatsApp
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-full px-7" onClick={() => navigate("/contact")}>
                Contact Page
              </Button>
            </div>
          </FadeIn>
        </Container>
      </section>
    </>
  );
}
