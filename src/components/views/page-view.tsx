"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { FadeIn } from "@/components/site/fade-in";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { siteOrigin } from "@/components/site/seo-helpers";
import { usePage } from "@/lib/queries";
import { ApiError } from "@/lib/api-client";
import { navigate } from "@/lib/router";
import { useSeo } from "@/lib/seo";

export default function GenericPageView({ slug }: { slug: string }) {
  const { data: page, isLoading, isError, error, refetch } = usePage(slug);
  const origin = siteOrigin();
  const is404 = error instanceof ApiError && error.status === 404;

  useSeo({
    title: page?.seoTitle || (page ? `${page.title} | Artistic by Khushiii` : "Artistic by Khushiii"),
    description: page?.metaDescription,
    canonical: `${origin}/page/${slug}`,
  });

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="mx-auto max-w-3xl space-y-3">
          <Skeleton className="h-9 w-1/2" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </Container>
    );
  }

  if (isError || !page) {
    if (is404) {
      return (
        <Container className="py-16">
          <EmptyState
            title="Page not found"
            message="We couldn't find that page. It may have been moved or renamed."
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

  return (
    <Container className="py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <FadeIn>
        <h1 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-4xl">{page.title}</h1>
        <div className="prose-content mt-6 max-w-3xl" dangerouslySetInnerHTML={{ __html: page.content }} />
      </FadeIn>
    </Container>
  );
}
