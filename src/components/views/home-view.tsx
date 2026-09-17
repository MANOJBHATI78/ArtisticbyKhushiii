"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Gem,
  Globe2,
  HandHeart,
  HeartHandshake,
  Layers,
  MessageCircle,
  Palette,
  Sparkles,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";
import { FadeIn } from "@/components/site/fade-in";
import { Img } from "@/components/site/img";
import { ResponsiveImg } from "@/components/site/responsive-img";
import { CategoryCard } from "@/components/site/category-card";
import { ProductCard, ViewAllLink } from "@/components/site/product-card";
import { BlogCard } from "@/components/site/blog-card";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { SectionHeading } from "@/components/site/section-heading";
import { CategoryGridSkeleton, HeroSkeleton, ProductGridSkeleton } from "@/components/site/skeletons";
import { ErrorState } from "@/components/site/empty-state";
import { RecentlyViewed } from "@/components/site/recently-viewed";
import { siteOrigin, socialSameAs } from "@/components/site/seo-helpers";
import { useHome } from "@/lib/queries";
import { navigate } from "@/lib/router";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { track } from "@/lib/track";
import { parseJsonArray } from "@/lib/types";
import { useSeo } from "@/lib/seo";

const WHY_ICONS = [Palette, Gem, HandHeart, Layers, HeartHandshake, Sparkles];
const TRUST_CHIPS = [
  { label: "Pan-India Delivery", icon: Truck },
  { label: "Worldwide Shipping", icon: Globe2 },
  { label: "100% Handmade", icon: HandHeart },
  { label: "Custom Designs", icon: Palette },
];

interface SectionItem {
  title?: string;
  text?: string;
}

function parseItems(raw: string | undefined | null): SectionItem[] {
  return parseJsonArray(raw).filter(
    (item): item is SectionItem => typeof item === "object" && item !== null
  );
}

export default function HomeView() {
  const { data: home, isLoading, isError, refetch } = useHome();
  const settings = useSiteStore((s) => s.settings);
  const openInquiry = useSiteStore((s) => s.openInquiry);

  const origin = siteOrigin();

  const jsonLd = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: settings.brandName,
        url: origin,
        logo: `${origin}${settings.logoUrl}`,
        telephone: settings.phone,
        email: settings.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: settings.city,
          addressRegion: settings.state,
          addressCountry: "IN",
        },
        sameAs: socialSameAs(settings),
      },
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${origin}/#localbusiness`,
        name: settings.brandName,
        description: settings.defaultMetaDescription,
        url: origin,
        image: `${origin}${settings.defaultOgImage}`,
        telephone: settings.phone,
        priceRange: "₹₹",
        address: {
          "@type": "PostalAddress",
          addressLocality: settings.city,
          addressRegion: settings.state,
          addressCountry: "IN",
        },
        areaServed: ["IN", "Worldwide"],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: settings.brandName,
        url: origin,
      },
    ],
    [settings, origin]
  );

  useSeo({
    title: settings.defaultSeoTitle,
    description: settings.defaultMetaDescription,
    canonical: `${origin}/`,
    ogImage: settings.defaultOgImage,
    jsonLd,
  });

  if (isError) {
    return (
      <Container className="py-20">
        <ErrorState onRetry={() => refetch()} />
      </Container>
    );
  }

  if (isLoading || !home) {
    return (
      <Container>
        <HeroSkeleton />
        <div className="space-y-4 py-16">
          <CategoryGridSkeleton count={3} />
          <ProductGridSkeleton count={4} />
        </div>
      </Container>
    );
  }

  const hero = home.hero;
  const brandIntro = home.brandIntro;
  const whyChoose = home.whyChoose;
  const customOrders = home.customOrders;
  const memory = home.memoryPreservation;
  const finalCta = home.finalCta;
  const featuredCategories = home.featuredCategories.slice(0, 6);
  const featuredProducts = home.featuredProducts.slice(0, 8);
  const latestBlogs = home.latestBlogs.slice(0, 3);

  return (
    <>
      {/* ============ 1. HERO ============ */}
      {hero?.visible !== false ? (
        <section aria-label="Introduction" className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 70% 20%, rgba(203,145,74,0.14), transparent 60%), radial-gradient(45% 40% at 15% 80%, rgba(184,116,94,0.10), transparent 60%)",
            }}
            aria-hidden="true"
          />
          <Container className="relative py-12 md:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-terracotta">
                  Handcrafted in Surat, delivered worldwide
                </p>
                <h1 className="font-display text-4xl leading-tight text-foreground md:text-6xl">
                  {hero?.heading || "Handcrafted Resin Art, Made Just for You"}
                </h1>
                <p className="mt-5 max-w-xl text-lg text-foreground/80 md:text-xl">
                  {hero?.subheading}
                </p>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">{hero?.body}</p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {hero?.ctaText ? (
                    <Button
                      size="lg"
                      className="h-12 rounded-full px-7 text-base"
                      onClick={() => navigate(hero.ctaUrl?.replace(/^#/, "") || "/products")}
                    >
                      {hero.ctaText}
                    </Button>
                  ) : null}
                  {hero?.ctaText2 ? (
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 rounded-full border-primary/30 px-7 text-base"
                      onClick={() =>
                        hero.ctaUrl2
                          ? navigate(hero.ctaUrl2.replace(/^#/, ""))
                          : openInquiry(null)
                      }
                    >
                      {hero.ctaText2}
                    </Button>
                  ) : null}
                  <a
                    href={whatsappLink(settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("whatsapp_click", { location: "home", section: "hero" })}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-[#128C7E] transition-colors hover:bg-[#25D366]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    WhatsApp us
                  </a>
                </div>

                <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3" aria-label="Why shop with us">
                  {TRUST_CHIPS.map((chip) => (
                    <li key={chip.label} className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                      <chip.icon className="size-4 text-terracotta" aria-hidden="true" />
                      {chip.label}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                className="relative mx-auto w-full max-w-md lg:max-w-none"
              >
                <div className="absolute -right-3 -top-3 size-full rounded-2xl border-2 border-gold/50" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-2xl shadow-xl">
                  <ResponsiveImg
                    src={hero?.imageUrl}
                    mobileSrc={hero?.mobileImageUrl}
                    alt="Handcrafted resin art pieces by Artistic by Khushi"
                    eager
                    className="aspect-[4/5] w-full object-cover sm:aspect-square lg:aspect-[4/5] max-sm:aspect-square max-sm:object-contain max-sm:p-3"
                  />
                </div>
                <div className="animate-float-soft absolute -bottom-5 -left-3 rounded-xl bg-card p-4 shadow-lg border border-gold/30 sm:-left-6">
                  <p className="flex items-center gap-1.5 font-display text-base text-foreground">
                    <Sparkles className="size-4 text-gold" aria-hidden="true" />
                    100% Handmade
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Made to order in Surat, India</p>
                </div>
              </motion.div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* ============ 2. BRAND INTRO ============ */}
      {brandIntro?.visible !== false ? (
        <section aria-label="Our story" className="py-16 md:py-24">
          <Container>
            <FadeIn>
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                  <div className="overflow-hidden rounded-2xl shadow-md">
                    <ResponsiveImg
                      src={brandIntro?.imageUrl}
                      mobileSrc={brandIntro?.mobileImageUrl}
                      alt="Artistic by Khushi resin art studio"
                      className="aspect-[4/3] w-full object-cover max-sm:object-contain max-sm:p-3"
                    />
                  </div>
                  {brandIntro?.subheading ? (
                    <p className="mt-3 text-center text-xs text-muted-foreground">{brandIntro.subheading}</p>
                  ) : null}
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-terracotta">Our story</p>
                  <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
                    {brandIntro?.heading}
                  </h2>
                  {brandIntro?.body ? (
                    <div className="prose-content mt-4 max-w-xl" dangerouslySetInnerHTML={{ __html: brandIntro.body }} />
                  ) : null}
                  <ul className="mt-6 space-y-4">
                    {parseItems(brandIntro?.itemsJson).map((item, i) => {
                      const icons = [Sparkles, Gem, HandHeart];
                      const Icon = icons[i % icons.length];
                      return (
                        <li key={i} className="flex gap-3">
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-terracotta">
                            <Icon className="size-4.5" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.text}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {brandIntro?.ctaText ? (
                    <a
                      href={`#${brandIntro.ctaUrl?.replace(/^#/, "") || "/about"}`}
                      className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline decoration-gold decoration-2 underline-offset-8 hover:text-terracotta-deep"
                    >
                      {brandIntro.ctaText} →
                    </a>
                  ) : null}
                </div>
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 3. FEATURED CATEGORIES ============ */}
      {featuredCategories.length > 0 ? (
        <section aria-label="Shop by collection" className="bg-secondary/50 py-16 md:py-24">
          <Container>
            <FadeIn>
              <SectionHeading
                eyebrow="Collections"
                title="Shop by Collection"
                subtext="Every category is a little world of handcrafted goodness — explore your favourite."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {featuredCategories.map((cat, i) => (
                  <FadeIn key={cat.slug} delay={i * 0.05}>
                    <CategoryCard category={cat} />
                  </FadeIn>
                ))}
              </div>
              <ViewAllLink href="/categories">View all categories</ViewAllLink>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 4. FEATURED PRODUCTS ============ */}
      {featuredProducts.length > 0 ? (
        <section aria-label="Featured products" className="py-16 md:py-24">
          <Container>
            <FadeIn>
              <SectionHeading
                eyebrow="Bestsellers"
                title="Handpicked Favourites"
                subtext="The pieces our customers love the most — each one made to order, just for you."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
                {featuredProducts.map((product, i) => (
                  <FadeIn key={product.slug} delay={i * 0.04}>
                    <ProductCard product={product} />
                  </FadeIn>
                ))}
              </div>
              <ViewAllLink href="/products">View all products</ViewAllLink>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 5. WHY CHOOSE ============ */}
      {whyChoose?.visible !== false && whyChoose ? (
        <section aria-label="Why choose us" className="bg-secondary/60 py-16 md:py-24">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="The difference" title={whyChoose.heading} subtext={whyChoose.subheading} />
              <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {parseItems(whyChoose.itemsJson).map((item, i) => {
                  const Icon = WHY_ICONS[i % WHY_ICONS.length];
                  return (
                    <FadeIn key={i} delay={i * 0.05} y={12} duration={0.45}>
                      <div className="h-full rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
                        <span className="flex size-11 items-center justify-center rounded-full bg-gold-soft text-terracotta">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <h3 className="mt-4 font-medium text-foreground">{item.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
              {whyChoose.ctaText ? (
                <div className="mt-10 text-center">
                  <Button size="lg" className="h-12 rounded-full px-7" onClick={() => navigate(whyChoose.ctaUrl?.replace(/^#/, "") || "/contact")}>
                    {whyChoose.ctaText}
                  </Button>
                </div>
              ) : null}
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 6. CUSTOM ORDERS ============ */}
      {customOrders?.visible !== false && customOrders ? (
        <section aria-label="Custom orders" className="py-16 md:py-24">
          <Container>
            <FadeIn>
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className="order-2 lg:order-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-terracotta">Bespoke studio</p>
                  <h2 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
                    {customOrders.heading}
                  </h2>
                  <p className="mt-3 text-base text-foreground/80 md:text-lg">{customOrders.subheading}</p>
                  {customOrders.body ? (
                    <div className="prose-content mt-4 max-w-xl" dangerouslySetInnerHTML={{ __html: customOrders.body }} />
                  ) : null}
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {parseItems(customOrders.itemsJson).map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button size="lg" className="h-12 rounded-full px-7" onClick={() => openInquiry(null)}>
                      {customOrders.ctaText || "Start Your Custom Order"}
                    </Button>
                    {customOrders.ctaText2 ? (
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-12 rounded-full px-7"
                        onClick={() => navigate(customOrders.ctaUrl2?.replace(/^#/, "") || "/category/custom-orders")}
                      >
                        {customOrders.ctaText2}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none">
                  <div className="overflow-hidden rounded-2xl shadow-md">
                    <ResponsiveImg
                      src={customOrders.imageUrl}
                      mobileSrc={customOrders.mobileImageUrl}
                      alt="Custom resin art order being crafted"
                      className="aspect-[4/3] w-full object-cover max-sm:object-contain max-sm:p-3"
                    />
                  </div>
                </div>
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 7. MEMORY PRESERVATION ============ */}
      {memory?.visible !== false && memory ? (
        <section aria-label="Memory preservation" className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute inset-0" aria-hidden="true">
            <Img src={memory.imageUrl} alt="" fallbackIcon={false} className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/80 to-espresso/20" />
          </div>
          <Container className="relative">
            <FadeIn className="max-w-2xl">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gold">Keep what matters</p>
              <h2 className="font-display text-3xl leading-tight text-cream md:text-5xl">{memory.heading}</h2>
              <p className="mt-4 text-base text-cream/85 md:text-lg">{memory.subheading}</p>
              {memory.body ? (
                <div className="prose-content mt-4 max-w-xl text-cream/80" dangerouslySetInnerHTML={{ __html: memory.body }} />
              ) : null}
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-gold px-7 text-base text-espresso hover:bg-gold/90"
                  onClick={() => navigate(memory.ctaUrl?.replace(/^#/, "") || "/category/memory-preservation")}
                >
                  {memory.ctaText || "Preserve Your Memory"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-cream/40 bg-transparent px-7 text-base text-cream hover:bg-cream/10 hover:text-cream"
                  asChild
                >
                  <a
                    href={whatsappLink(settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("whatsapp_click", { location: "home", section: "memory_preservation" })}
                  >
                    <MessageCircle aria-hidden="true" />
                    Enquire on WhatsApp
                  </a>
                </Button>
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 8. LATEST BLOGS ============ */}
      {latestBlogs.length > 0 ? (
        <section aria-label="From the journal" className="py-16 md:py-24">
          <Container>
            <FadeIn>
              <SectionHeading
                eyebrow="The journal"
                title="From the Journal"
                subtext="Care guides, design ideas and behind-the-scenes from the studio."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {latestBlogs.map((post, i) => (
                  <FadeIn key={post.slug} delay={i * 0.05}>
                    <BlogCard post={post} />
                  </FadeIn>
                ))}
              </div>
              <ViewAllLink href="/blog">Read the blog</ViewAllLink>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 9. FAQS ============ */}
      {home.faqs.length > 0 ? (
        <section aria-label="Frequently asked questions" className="bg-secondary/50 py-16 md:py-24">
          <Container>
            <FadeIn>
              <SectionHeading
                eyebrow="Good to know"
                title="Questions, Answered"
                subtext="Everything people usually ask before ordering — delivery, customization and care."
              />
              <div className="mx-auto max-w-3xl rounded-2xl border bg-card px-4 py-2 md:px-6">
                <FaqAccordion faqs={home.faqs} withSchema />
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* ============ 10. RECENTLY ADMIRED (visitor history) ============ */}
      <RecentlyViewed context="home" />

      {/* ============ 11. FINAL CTA ============ */}
      {finalCta?.visible !== false && finalCta ? (
        <section aria-label="Get in touch" className="relative overflow-hidden bg-espresso py-20 md:py-28">
          <div className="absolute inset-0 opacity-15" aria-hidden="true">
            <Img src={finalCta.imageUrl} alt="" fallbackIcon={false} className="size-full object-cover" />
          </div>
          <Container className="relative text-center">
            <FadeIn>
              <h2 className="font-display text-3xl leading-tight text-cream md:text-5xl">{finalCta.heading}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-cream/80 md:text-lg">{finalCta.subheading}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-gold px-8 text-base text-espresso hover:bg-gold/90"
                  onClick={() => openInquiry(null)}
                >
                  {finalCta.ctaText || "Send an Inquiry"}
                </Button>
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
                    onClick={() => track("whatsapp_click", { location: "home", section: "final_cta" })}
                  >
                    <MessageCircle aria-hidden="true" />
                    WhatsApp Us
                  </a>
                </Button>
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}
    </>
  );
}
