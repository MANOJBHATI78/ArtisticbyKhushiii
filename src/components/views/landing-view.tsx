"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FadeIn } from "@/components/site/fade-in";
import { ResponsiveImg } from "@/components/site/responsive-img";
import { ProductCard } from "@/components/site/product-card";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { SectionHeading } from "@/components/site/section-heading";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useLandingPage } from "@/lib/queries";
import { ApiError } from "@/lib/api-client";
import { navigate } from "@/lib/router";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { track } from "@/lib/track";
import { splitList } from "@/lib/types";
import { useSeo } from "@/lib/seo";

// ============================================================
// Public landing page view (#/lp/{slug}) — admin-built marketing
// pages with full SEO / GEO / AI-LLM optimization.
// ============================================================

export default function LandingView({ slug }: { slug: string }) {
  const { data, isLoading, isError, error, refetch } = useLandingPage(slug);
  const settings = useSiteStore((s) => s.settings);
  const origin = siteOrigin();
  const is404 = error instanceof ApiError && error.status === 404;

  const landing = data?.landing;
  const products = data?.products ?? [];
  const faqs = data?.faqs ?? [];

  // ---- structured data: owner's schemaJson + auto FAQPage (deduped) ----
  const jsonLd = useMemo(() => {
    if (!landing) return undefined;
    const parts: Record<string, unknown>[] = [];
    if (landing.schemaJson.trim()) {
      try {
        const parsed: unknown = JSON.parse(landing.schemaJson);
        if (Array.isArray(parsed)) {
          parts.push(...parsed.filter((s): s is Record<string, unknown> => !!s && typeof s === "object"));
        } else if (parsed && typeof parsed === "object") {
          parts.push(parsed as Record<string, unknown>);
        }
      } catch {
        /* invalid JSON saved by the owner — skip silently, page still renders */
      }
    }
    if (faqs.length > 0 && !parts.some((s) => s?.["@type"] === "FAQPage")) {
      parts.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      });
    }
    return parts.length > 0 ? parts : undefined;
  }, [landing, faqs]);

  useSeo({
    title: landing ? landing.metaTitle || `${landing.title} | Artistic by Khushiii` : "Landing | Artistic by Khushiii",
    description: landing?.metaDescription || landing?.subheadline || landing?.llmSummary,
    canonical: landing?.canonicalUrl || `${origin}/lp/${slug}`,
    ogImage: landing?.ogImageUrl || landing?.heroImageUrl || undefined,
    noindex: landing?.noindex,
    jsonLd,
  });

  // ---- GEO meta tags (geo.region / geo.placename / geo.position + keywords) ----
  useEffect(() => {
    if (!landing) return;
    const created: HTMLMetaElement[] = [];
    const restored: { el: HTMLMetaElement; content: string }[] = [];
    const upsert = (name: string, content: string) => {
      if (!content.trim()) return;
      let m = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (m) {
        // Existing tag (e.g. the app-wide keywords meta) — update in place, restore on unmount.
        if (!m.hasAttribute("data-landing-meta")) restored.push({ el: m, content: m.content });
        m.content = content.trim();
      } else {
        m = document.createElement("meta");
        m.name = name;
        m.content = content.trim();
        document.head.appendChild(m);
        created.push(m);
      }
      m.setAttribute("data-landing-meta", "true");
    };
    upsert("geo.region", landing.geoRegion);
    upsert("geo.placename", landing.geoPlacename);
    upsert("geo.position", landing.geoPosition);
    upsert("ICBM", landing.geoPosition);
    const keywords = [
      ...splitList(landing.focusKeyword),
      ...splitList(landing.secondaryKeywords),
      ...splitList(landing.llmKeywords),
      ...splitList(landing.targetLocations),
    ];
    if (keywords.length > 0) upsert("keywords", [...new Set(keywords)].join(", "));
    return () => {
      for (const m of created) m.remove();
      for (const r of restored) {
        r.el.content = r.content;
        r.el.removeAttribute("data-landing-meta");
      }
    };
  }, [landing]);

  // ---- custom JS (power-user field) — execute + cleanup on unmount ----
  const customJs = landing?.customJs ?? "";
  useEffect(() => {
    if (!customJs.trim()) return;
    const script = document.createElement("script");
    script.setAttribute("data-landing-custom-js", "true");
    script.text = customJs;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [customJs]);

  // ---------------- loading ----------------
  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-4 w-40 rounded-full bg-secondary animate-shimmer" />
          <div className="h-10 w-full bg-secondary animate-shimmer" />
          <div className="h-10 w-2/3 bg-secondary animate-shimmer" />
          <div className="aspect-[16/9] w-full rounded-2xl bg-secondary animate-shimmer" />
          <div className="h-4 w-full bg-secondary animate-shimmer" />
          <div className="h-4 w-5/6 bg-secondary animate-shimmer" />
        </div>
      </Container>
    );
  }

  // ---------------- 404 / error ----------------
  if (isError || !landing) {
    if (is404) {
      return (
        <Container className="py-16">
          <EmptyState
            title="Page not found"
            message="This landing page seems to have been moved, unpublished or the link is incomplete."
            action={
              <Button className="h-11" onClick={() => navigate("/")}>
                Back to Home
              </Button>
            }
          />
        </Container>
      );
    }
    return (
      <Container className="py-16">
        <ErrorState onRetry={() => refetch()} />
      </Container>
    );
  }

  const ctaText = landing.ctaText || "Explore the Collection";
  const ctaUrl = landing.ctaUrl || "/products";
  const isExternalCta = /^https?:\/\//i.test(ctaUrl);
  const heroAlt = landing.headline || landing.title;
  const hasCtaBar = !!landing.ctaText;

  return (
    <>
      {landing.customCss ? <style dangerouslySetInnerHTML={{ __html: landing.customCss }} /> : null}

      {/* ============ 1. HERO ============ */}
      <section aria-label={landing.title} className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 70% 20%, rgba(203,145,74,0.14), transparent 60%), radial-gradient(45% 40% at 15% 80%, rgba(184,116,94,0.10), transparent 60%)",
          }}
          aria-hidden="true"
        />
        <Container className="relative py-8 md:py-14">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: landing.title }]} />

          <div className="mt-6 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1 className="font-display text-4xl leading-tight text-foreground md:text-5xl">
                {landing.headline || landing.title}
              </h1>
              {landing.subheadline ? (
                <p className="mt-5 max-w-xl text-lg text-foreground/80 md:text-xl">{landing.subheadline}</p>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {isExternalCta ? (
                  <Button size="lg" className="h-12 rounded-full px-7 text-base" asChild>
                    <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                      {ctaText}
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="h-12 rounded-full px-7 text-base"
                    onClick={() => navigate(ctaUrl.replace(/^#/, ""))}
                  >
                    {ctaText}
                  </Button>
                )}
                <a
                  href={whatsappLink(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("whatsapp_click", { location: "landing", section: "hero" })}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#128C7E] transition-colors hover:bg-[#25D366]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp us
                </a>
              </div>
            </motion.div>

            {landing.heroImageUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                className="relative mx-auto w-full max-w-md lg:max-w-none"
              >
                <div className="absolute -right-3 -top-3 size-full rounded-2xl border-2 border-gold/50" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-2xl shadow-xl">
                  <ResponsiveImg
                    src={landing.heroImageUrl}
                    mobileSrc={landing.heroMobileImageUrl}
                    alt={heroAlt}
                    eager
                    className="aspect-[4/3] w-full object-cover sm:aspect-square lg:aspect-[4/3] max-sm:aspect-square max-sm:object-contain max-sm:p-3"
                  />
                </div>
              </motion.div>
            ) : null}
          </div>
        </Container>
      </section>

      {/* ============ 2. QUICK SUMMARY (GEO / AI-friendly) ============ */}
      {landing.llmSummary ? (
        <Container className="pb-4 md:pb-8">
          <FadeIn>
            <div className="mx-auto max-w-3xl rounded-2xl border border-gold/30 bg-gold-soft/40 p-5 md:p-6">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-terracotta">
                <Sparkles className="size-4" aria-hidden="true" />
                Quick Summary
              </p>
              <p className="mt-2 text-base leading-relaxed text-foreground/85">{landing.llmSummary}</p>
            </div>
          </FadeIn>
        </Container>
      ) : null}

      {/* ============ 3. BODY CONTENT ============ */}
      {landing.bodyHtml ? (
        <Container className="py-8 md:py-12">
          <FadeIn>
            <article className="prose-content mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: landing.bodyHtml }} />
          </FadeIn>
        </Container>
      ) : null}

      {/* ============ 4. FEATURED PRODUCTS ============ */}
      {products.length > 0 ? (
        <section aria-label="Featured pieces" className="bg-secondary/50 py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading
                eyebrow="Handpicked for you"
                title="Featured Pieces"
                subtext={landing.ctaText ? `Picked for “${landing.title}” — each one made to order, just for you.` : undefined}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
                {products.map((p, i) => (
                  <FadeIn key={p.slug} delay={i * 0.04}>
                    <ProductCard product={p} />
                  </FadeIn>
                ))}
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 5. FAQS ============ */}
      {faqs.length > 0 ? (
        <section aria-label="Frequently asked questions" className="py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="Good to know" title="You Might Ask" />
              <div className="mx-auto max-w-3xl rounded-2xl border bg-card px-4 py-2 md:px-6">
                <FaqAccordion faqs={faqs} />
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 6. FINAL CTA BANNER ============ */}
      <section aria-label="Get in touch" className="relative overflow-hidden bg-espresso py-16 md:py-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(70% 60% at 50% 0%, rgba(203,145,74,0.18), transparent 60%)",
          }}
          aria-hidden="true"
        />
        <Container className="relative text-center">
          <FadeIn>
            <h2 className="font-display text-3xl leading-tight text-cream md:text-4xl">
              {landing.headline || landing.title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-cream/80 md:text-lg">
              {landing.subheadline || "Handcrafted with love in Surat — delivered across India and worldwide."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isExternalCta ? (
                <Button size="lg" className="h-12 rounded-full bg-gold px-8 text-base text-espresso hover:bg-gold/90" asChild>
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                    {ctaText}
                    <ArrowRight className="ml-1 size-4" aria-hidden="true" />
                  </a>
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-gold px-8 text-base text-espresso hover:bg-gold/90"
                  onClick={() => navigate(ctaUrl.replace(/^#/, ""))}
                >
                  {ctaText}
                  <ArrowRight className="ml-1 size-4" aria-hidden="true" />
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-cream/40 bg-transparent px-8 text-base text-cream hover:bg-cream/10 hover:text-cream"
                asChild
              >
                <a
                  href={whatsappLink(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("whatsapp_click", { location: "landing", section: "final_cta" })}
                >
                  <MessageCircle aria-hidden="true" />
                  WhatsApp Us
                </a>
              </Button>
            </div>
          </FadeIn>
        </Container>
      </section>

      {/* ============ 7. CUSTOM HTML (power-user) ============ */}
      {landing.customHtml ? (
        <Container>
          <div dangerouslySetInnerHTML={{ __html: landing.customHtml }} />
        </Container>
      ) : null}

      {/* Spacer so the sticky mobile CTA bar never covers content/footer. */}
      {hasCtaBar ? <div className="h-20 sm:hidden" aria-hidden="true" /> : null}

      {/* ============ 8. STICKY MOBILE CTA ============ */}
      {hasCtaBar ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:hidden"
          role="complementary"
          aria-label="Quick actions"
        >
          <div className="flex items-center gap-2 p-3 pr-20">
            {isExternalCta ? (
              <Button className="h-11 min-h-11 flex-1 rounded-full" asChild>
                <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                  {ctaText}
                </a>
              </Button>
            ) : (
              <Button className="h-11 min-h-11 flex-1 rounded-full" onClick={() => navigate(ctaUrl.replace(/^#/, ""))}>
                {ctaText}
              </Button>
            )}
            <a
              href={whatsappLink(settings)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp_click", { location: "landing", section: "sticky_bar" })}
              aria-label="Chat on WhatsApp"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md"
            >
              <MessageCircle className="size-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
