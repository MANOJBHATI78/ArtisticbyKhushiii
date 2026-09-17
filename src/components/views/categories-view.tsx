"use client";

import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CategoryCard } from "@/components/site/category-card";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { CategoryGridSkeleton } from "@/components/site/skeletons";
import { FadeIn } from "@/components/site/fade-in";
import { SectionHeading } from "@/components/site/section-heading";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useCategories } from "@/lib/queries";
import { useSeo } from "@/lib/seo";

export default function CategoriesView() {
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const origin = siteOrigin();

  useSeo({
    title: "Categories | Artistic by Khushiii",
    description:
      "Explore our handcrafted resin art collections — nameplates, mantra frames, wall art, trays, coasters, keychains, jewellery, memory preservation keepsakes and custom orders.",
    canonical: `${origin}/categories`,
  });

  return (
    <Container className="py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />

      <div className="mt-4 max-w-2xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-terracotta">Browse</p>
        <h1 className="font-display text-3xl leading-tight text-foreground md:text-4xl">Explore Our Collections</h1>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">
          Ten worlds of handcrafted resin art — pick your favourite and dive in.
        </p>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <CategoryGridSkeleton count={6} />
      ) : !categories || categories.length === 0 ? (
        <EmptyState
          title="Collections coming soon"
          message="Our catalogue is being arranged — check back shortly or enquire about a custom piece."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <FadeIn key={cat.slug} delay={i * 0.05}>
              <CategoryCard category={cat} />
            </FadeIn>
          ))}
        </div>
      )}
    </Container>
  );
}
