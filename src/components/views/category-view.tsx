"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProductCard } from "@/components/site/product-card";
import { CategoryCard } from "@/components/site/category-card";
import { BlogCard } from "@/components/site/blog-card";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { ProductGridSkeleton } from "@/components/site/skeletons";
import { SectionHeading } from "@/components/site/section-heading";
import { FadeIn } from "@/components/site/fade-in";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useCategory } from "@/lib/queries";
import { ApiError } from "@/lib/api-client";
import { navigate } from "@/lib/router";
import { useSiteStore } from "@/lib/store";
import { useSeo } from "@/lib/seo";

export default function CategoryView({ slug }: { slug: string }) {
  const { data, isLoading, isError, error, refetch } = useCategory(slug);
  const openInquiry = useSiteStore((s) => s.openInquiry);
  const origin = siteOrigin();

  const category = data?.category;
  const products = data?.products || [];
  const faqs = data?.faqs || [];
  const relatedCategories = data?.relatedCategories || [];
  const relatedBlogs = data?.relatedBlogs || [];
  const is404 = error instanceof ApiError && error.status === 404;

  useSeo({
    title: category?.seoTitle || (category ? `${category.name} | Artistic by Khushi` : "Collection | Artistic by Khushi"),
    description: category?.metaDescription || category?.shortDescription,
    canonical: `${origin}/category/${slug}`,
    jsonLd: useMemo(() => {
      if (!category) return undefined;
      const schemas: Record<string, unknown>[] = [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: category.name,
          description: category.metaDescription || category.shortDescription,
          url: `${origin}/category/${category.slug}`,
        },
      ];
      if (faqs.length > 0) {
        schemas.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        });
      }
      return schemas;
    }, [category, faqs, origin]),
  });

  if (isLoading) {
    return (
      <Container className="py-8">
        <ProductGridSkeleton count={6} />
      </Container>
    );
  }

  if (isError || !category) {
    if (is404) {
      return (
        <Container className="py-16">
          <EmptyState
            title="Collection not found"
            message="We couldn't find that collection — it may have been renamed. Browse all our collections instead."
            action={
              <Button className="h-11" onClick={() => navigate("/categories")}>
                View All Collections
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

  return (
    <>
      <Container className="py-8 md:py-12">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            { label: category.name },
          ]}
        />

        <FadeIn>
          <div className="mt-4 max-w-3xl">
            <h1 className="font-display text-3xl leading-tight text-foreground md:text-4xl">{category.name}</h1>
            <p className="mt-3 text-base text-foreground/80 md:text-lg">{category.shortDescription}</p>
          </div>
          {category.introContent ? (
            <div className="prose-content mt-5 max-w-3xl" dangerouslySetInnerHTML={{ __html: category.introContent }} />
          ) : null}
        </FadeIn>

        <div className="mt-10">
          <SectionHeading
            align="left"
            eyebrow="Handcrafted for you"
            title={`${products.length} ${products.length === 1 ? "Design" : "Designs"} in This Collection`}
            className="mb-6"
          />
          {products.length === 0 ? (
            <EmptyState
              title="New pieces are curing"
              message="This collection is being restocked with fresh handcrafted designs. Enquire and we'll craft one just for you."
              action={
                <Button className="h-11" onClick={() => openInquiry({ productSlug: "", productName: category.name, productUrl: `/category/${category.slug}`, category: category.name })}>
                  Enquire About This Collection
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Customization callout */}
        <FadeIn className="mt-12">
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-gold/40 bg-gold-soft/40 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
            <div>
              <h2 className="font-display text-xl text-foreground md:text-2xl">Make it uniquely yours</h2>
              <p className="mt-1.5 text-sm text-foreground/75 md:text-base">
                Every piece in this collection can be customized — colours, names, sizes and themes.
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 shrink-0 rounded-full px-7"
              onClick={() => openInquiry({ productSlug: "", productName: category.name, productUrl: `/category/${category.slug}`, category: category.name })}
            >
              Enquire Now
            </Button>
          </div>
        </FadeIn>
      </Container>

      {/* Category FAQs */}
      {faqs.length > 0 ? (
        <section aria-label="Collection questions" className="bg-secondary/50 py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="Good to know" title={`${category.name} — Questions`} />
              <div className="mx-auto max-w-3xl rounded-2xl border bg-card px-4 py-2 md:px-6">
                <FaqAccordion faqs={faqs} />
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Related categories */}
      {relatedCategories.length > 0 ? (
        <section aria-label="Related collections" className="py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="Keep exploring" title="You May Also Love" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
                {relatedCategories.map((cat) => (
                  <CategoryCard key={cat.slug} category={cat} />
                ))}
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Related blogs */}
      {relatedBlogs.length > 0 ? (
        <section aria-label="From the journal" className="bg-secondary/50 py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="The journal" title="From the Journal" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {relatedBlogs.map((post) => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Bottom content — rendered last (SEO copy below the catalogue) */}
      {category.bottomContent ? (
        <Container className="py-10 md:py-14">
          <div className="prose-content mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: category.bottomContent }} />
        </Container>
      ) : null}
    </>
  );
}
