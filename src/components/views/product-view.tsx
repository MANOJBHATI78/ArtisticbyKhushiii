"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, MousePointer2, Phone, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Img } from "@/components/site/img";
import { ProductCard } from "@/components/site/product-card";
import { BlogCard } from "@/components/site/blog-card";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { ProductDetailSkeleton } from "@/components/site/skeletons";
import { SectionHeading } from "@/components/site/section-heading";
import { FadeIn } from "@/components/site/fade-in";
import { Lightbox, ZoomHint, type LightboxImage } from "@/components/site/lightbox";
import { ShareRow } from "@/components/site/share-row";
import { WishlistButton } from "@/components/site/wishlist-button";
import { ProductStickyCta } from "@/components/site/product-sticky-cta";
import { ProductTestimonials, useProductTestimonials } from "@/components/site/product-testimonials";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useProduct } from "@/lib/queries";
import { ApiError } from "@/lib/api-client";
import { navigate } from "@/lib/router";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { splitList } from "@/lib/types";
import { trackCallClick, trackWhatsAppClick } from "@/lib/track";
import { useSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export default function ProductView({ slug }: { slug: string }) {
  const { data, isLoading, isError, error, refetch } = useProduct(slug);
  const settings = useSiteStore((s) => s.settings);
  const openInquiry = useSiteStore((s) => s.openInquiry);
  const trackRecent = useSiteStore((s) => s.trackRecent);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Hover magnifier (desktop only): 2× zoom that follows the cursor.
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const origin = siteOrigin();

  const product = data?.product;
  const category = data?.category;

  // Same query key as the reviews section → one cached fetch, reused for JSON-LD.
  const { data: reviews } = useProductTestimonials(product?.name ?? "");

  // Remember this piece for the "Recently admired" strip (skip while loading).
  useEffect(() => {
    if (product?.slug) trackRecent(product.slug);
  }, [product?.slug, trackRecent]);

  const is404 = error instanceof ApiError && error.status === 404;

  useSeo({
    title: product?.seoTitle || (product ? `${product.name} | Artistic by Khushiii` : "Product | Artistic by Khushiii"),
    description: product?.metaDescription || product?.shortDescription,
    canonical: `${origin}/product/${slug}`,
    ogImage: product?.featuredImageUrl,
    ogType: "product",
    jsonLd: useMemo(() => {
      if (!product) return undefined;
      // Aggregate rating from published reviews → star ratings in Google results.
      const reviewed = (reviews ?? []).filter((t) => t.rating >= 1);
      const aggregateRating =
        reviewed.length > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: Math.round((reviewed.reduce((s, t) => s + t.rating, 0) / reviewed.length) * 10) / 10,
              reviewCount: reviewed.length,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined;
      return [
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.metaDescription || product.shortDescription,
          image: `${origin}${product.featuredImageUrl}`,
          sku: product.sku,
          brand: { "@type": "Brand", name: settings.brandName },
          category: product.categoryName,
          material: product.material,
          url: `${origin}/product/${product.slug}`,
          ...(aggregateRating ? { aggregateRating } : {}),
        },
      ];
    }, [product, origin, settings.brandName, reviews]),
  });

  if (isLoading) {
    return (
      <Container className="py-8">
        <ProductDetailSkeleton />
      </Container>
    );
  }

  if (isError || !product) {
    if (is404) {
      return (
        <Container className="py-16">
          <EmptyState
            title="This piece has moved on"
            message="We couldn't find that product — it may have been renamed or is being remade. Explore our full catalogue instead."
            action={
              <Button className="h-11" onClick={() => navigate("/products")}>
                Browse All Products
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

  const gallery = product.gallery.length > 0 ? product.gallery : [];
  const current = gallery[activeImage];
  const highlights = splitList(product.highlights);
  const customization = splitList(product.customizationOptions);
  const tags = splitList(product.tags);
  const productUrl = `/product/${product.slug}`;

  // Lightbox images = full gallery (or the featured image when there's no gallery).
  const lightboxImages: LightboxImage[] = gallery.length > 0
    ? gallery.map((g) => ({ url: g.url, alt: g.alt || product.name, caption: g.caption || undefined }))
    : [{ url: product.featuredImageUrl, alt: product.featuredImageAlt || product.name }];

  const specRows = [
    { label: "Size", value: product.size },
    { label: "Material", value: product.material },
    { label: "Colour", value: product.colour },
    { label: "Occasion", value: product.occasion },
    { label: "Care", value: product.careInstructions },
    { label: "SKU", value: product.sku },
  ].filter((row) => row.value);

  const phoneHref = `tel:${settings.phone.replace(/\s/g, "")}`;

  return (
    <>
      <Container className="py-6 md:py-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: category?.name || product.categoryName, href: category ? `/category/${category.slug}` : undefined },
            { label: product.name },
          ]}
        />

        <div className="mt-6 grid gap-8 pb-4 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="group relative overflow-hidden rounded-xl border bg-card">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Open image in full-screen viewer"
                className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setZoomed(true);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setZoomed(false);
                }}
                onPointerMove={(e) => {
                  if (e.pointerType !== "mouse") return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setZoomOrigin({
                    x: Math.min(100, Math.max(0, x)),
                    y: Math.min(100, Math.max(0, y)),
                  });
                }}
              >
                <div className="aspect-square overflow-hidden bg-secondary max-sm:p-4">
                  <Img
                    src={current?.url || product.featuredImageUrl}
                    alt={current?.alt || product.featuredImageAlt || product.name}
                    eager
                    style={{
                      transform: zoomed ? "scale(2)" : undefined,
                      transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                    }}
                    className="size-full object-cover transition-transform duration-200 ease-out max-sm:object-contain max-sm:transition-none"
                  />
                </div>
                <ZoomHint />
              </button>
            </div>
            <p className="mt-2 hidden items-center gap-1.5 text-xs text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:flex">
              <MousePointer2 className="size-3.5" aria-hidden="true" />
              Hover to magnify · click for full screen
            </p>
            {gallery.length > 1 ? (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1 custom-scroll" role="group" aria-label="Product images">
                {gallery.map((image, i) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`Show image ${i + 1} of ${gallery.length}`}
                    aria-pressed={i === activeImage}
                    className={cn(
                      "size-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                      i === activeImage ? "border-primary ring-2 ring-primary" : "border-transparent opacity-80 ring-0 hover:scale-105 hover:opacity-100"
                    )}
                  >
                    <Img src={image.url} alt={image.alt || `${product.name} — image ${i + 1}`} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            {current?.caption ? (
              <p className="mt-2 text-xs text-muted-foreground">{current.caption}</p>
            ) : null}
          </div>

          {/* Summary */}
          <div>
            {product.categoryName ? (
              <a
                href={`#/category/${product.categorySlug}`}
                className="inline-block rounded-full bg-gold-soft px-3 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-gold/40"
              >
                {product.categoryName}
              </a>
            ) : null}
            <h1 className="mt-3 font-display text-3xl leading-tight text-foreground md:text-4xl">{product.name}</h1>
            <p className="mt-3 text-base text-foreground/80 md:text-lg">{product.shortDescription}</p>

            {highlights.length > 0 ? (
              <ul className="mt-5 space-y-2.5">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                    {h}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 flex-1 rounded-full px-6 text-base"
                onClick={() =>
                  openInquiry({
                    productSlug: product.slug,
                    productName: product.name,
                    productUrl,
                    category: product.categoryName,
                  })
                }
              >
                Enquire About This Product
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full px-6 text-base text-[#128C7E] hover:bg-[#25D366]/10"
                asChild
              >
                <a
                  href={whatsappLink(settings, product.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick("product", product.slug)}
                  aria-label={`Ask about ${product.name} on WhatsApp`}
                >
                  <MessageCircle aria-hidden="true" />
                  WhatsApp
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-full px-6 text-base" asChild>
                <a href={phoneHref} onClick={() => trackCallClick("product")} aria-label={`Call us on ${settings.phone}`}>
                  <Phone aria-hidden="true" />
                  Call
                </a>
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <WishlistButton slug={product.slug} name={product.name} variant="inline" />
              <ShareRow
                url={productUrl}
                title={`${product.name} — Artistic by Khushiii`}
                message={`Look at this handcrafted ${product.name} 👀`}
                image={product.featuredImageUrl?.startsWith("http") ? product.featuredImageUrl : `${origin}${product.featuredImageUrl}`}
                context="product"
                label={null}
              />
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Made to order in {settings.city}, {settings.state}</span>
              <span className="opacity-50" aria-hidden="true">•</span>
              <span>Pan-India & worldwide delivery</span>
            </p>
          </div>
        </div>

        {/* Details tabs */}
        <Tabs defaultValue="details" className="mt-8">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-secondary p-1.5">
            <TabsTrigger value="details" className="min-h-11 rounded-lg px-4 data-[state=active]:bg-card">
              Details
            </TabsTrigger>
            <TabsTrigger value="specs" className="min-h-11 rounded-lg px-4 data-[state=active]:bg-card">
              Specifications
            </TabsTrigger>
            <TabsTrigger value="custom" className="min-h-11 rounded-lg px-4 data-[state=active]:bg-card">
              Customization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <div className="prose-content max-w-3xl" dangerouslySetInnerHTML={{ __html: product.longDescription }} />
          </TabsContent>

          <TabsContent value="specs" className="mt-6">
            <dl className="grid max-w-3xl grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
              {specRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-6 border-b border-border py-3.5">
                  <dt className="text-sm font-medium text-foreground">{row.label}</dt>
                  <dd className="text-right text-sm text-muted-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
            {tags.length > 0 ? (
              <div className="mt-6 max-w-3xl">
                <h2 className="text-sm font-medium text-foreground">Tags</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <p className="max-w-3xl text-sm text-muted-foreground">
              This piece is made to order — personalize any of the following before we begin crafting:
            </p>
            <ul className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-2">
              {customization.map((option, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-lg border bg-card p-4">
                  <Wand2 className="mt-0.5 size-5 shrink-0 text-terracotta" aria-hidden="true" />
                  <span className="text-sm text-foreground/90">{option}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-6 h-12 rounded-full px-7" onClick={() => openInquiry({
              productSlug: product.slug,
              productName: product.name,
              productUrl,
              category: product.categoryName,
            })}>
              Request a Custom Version
            </Button>
          </TabsContent>
        </Tabs>
      </Container>

      {/* Related products */}
      {data?.relatedProducts && data.relatedProducts.length > 0 ? (
        <section aria-label="You may also like" className="bg-secondary/50 py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="Keep exploring" title="You May Also Like" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
                {data.relatedProducts.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Related blogs */}
      {data?.relatedBlogs && data.relatedBlogs.length > 0 ? (
        <section aria-label="From the journal" className="py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="The journal" title="From the Journal" subtext="Guides and ideas related to this piece." />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {data.relatedBlogs.map((post) => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Product FAQs */}
      {data?.faqs && data.faqs.length > 0 ? (
        <section aria-label="Product questions" className="bg-secondary/50 py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="Before you order" title="Questions About This Piece" />
              <div className="mx-auto max-w-3xl rounded-2xl border bg-card px-4 py-2 md:px-6">
                <FaqAccordion faqs={data.faqs} withSchema />
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Reviews for this piece (piece-specific first, general studio love fills) */}
      <ProductTestimonials productName={product.name} />

      {/* Final CTA */}
      <section aria-label="Enquire" className="relative overflow-hidden bg-espresso py-16 md:py-24">
        <Container className="text-center">
          <FadeIn>
            <h2 className="font-display text-3xl leading-tight text-cream md:text-4xl">
              Want this piece made just for you?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-cream/80">
              Tell us your colours, names and occasion — we&apos;ll craft it by hand and ship it anywhere.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-12 rounded-full bg-gold px-8 text-base text-espresso hover:bg-gold/90"
                onClick={() =>
                  openInquiry({
                    productSlug: product.slug,
                    productName: product.name,
                    productUrl,
                    category: product.categoryName,
                  })
                }
              >
                Send an Inquiry
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-cream/40 bg-transparent px-8 text-base text-cream hover:bg-cream/10 hover:text-cream"
                asChild
              >
                <a
                  href={whatsappLink(settings, product.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick("product", product.slug)}
                >
                  <MessageCircle aria-hidden="true" />
                  WhatsApp Us
                </a>
              </Button>
            </div>
          </FadeIn>
        </Container>
      </section>
      {/* Full-screen image viewer (keyboard: ← → Esc) */}
      <Lightbox
        images={lightboxImages}
        index={lightboxOpen ? activeImage : null}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(i) => {
          setActiveImage(i);
        }}
      />

      {/* Mobile-only sticky Enquire bar */}
      <ProductStickyCta product={product} />
    </>
  );
}
