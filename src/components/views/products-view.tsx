"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProductCard } from "@/components/site/product-card";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { ProductGridSkeleton } from "@/components/site/skeletons";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useCategories, useProducts } from "@/lib/queries";
import { navigate, useHashRoute } from "@/lib/router";
import { useSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

function buildUrl(params: { category?: string; q?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return `/products${qs ? `?${qs}` : ""}`;
}

export default function ProductsView() {
  const route = useHashRoute();
  const origin = siteOrigin();
  const category = route.query.get("category") || "";
  const q = route.query.get("q") || "";
  const page = Math.max(1, Number(route.query.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input aligned when the URL query changes externally (e.g. back button).
  if (lastQ !== q) {
    setLastQ(q);
    setSearchInput(q);
  }

  const { data: categories } = useCategories();
  const { data, isLoading, isError, refetch, isFetching } = useProducts(page, PAGE_SIZE, category, q);

  useSeo({
    title: "All Products | Artistic by Khushi",
    description:
      "Browse every handcrafted resin creation — nameplates, wall art, trays, coasters, keychains, jewellery and custom gifts, made to order by Artistic by Khushi.",
    canonical: `${origin}/products`,
  });

  // Debounce search input → URL update (keeps scroll position).
  useEffect(() => {
    if (searchInput === q) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      navigate(buildUrl({ category, q: searchInput.trim() }), { replace: true, keepScroll: true });
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchInput, category, q]);

  const setCategory = (slug: string) => {
    navigate(buildUrl({ category: slug, q }), { keepScroll: true });
  };

  const clearSearch = () => {
    setSearchInput("");
    navigate(buildUrl({ category }), { replace: true, keepScroll: true });
  };

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const activeCategoryName = categories?.find((c) => c.slug === category)?.name;

  // Compact page number list with ellipsis.
  const pageNumbers: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== "…") {
      pageNumbers.push("…");
    }
  }

  return (
    <Container className="py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: activeCategoryName || "Products" }]} />

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">
            {activeCategoryName ? activeCategoryName : "All Products"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            {isLoading
              ? "Loading handcrafted pieces…"
              : q || category
                ? `Showing ${items.length} of ${total} handcrafted pieces`
                : `Showing ${items.length} of ${total} handcrafted pieces — every one made to order`}
          </p>
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="h-11 pl-9 pr-10"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Category filter chips */}
      <div className="mt-6 -mx-4 overflow-x-auto px-4 pb-1 custom-scroll" role="group" aria-label="Filter by category">
        <div className="flex w-max gap-2">
          <button
            type="button"
            onClick={() => setCategory("")}
            aria-pressed={!category}
            className={cn(
              "min-h-11 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
              !category
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:border-gold/50 hover:text-primary"
            )}
          >
            All
          </button>
          {(categories || []).map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setCategory(cat.slug)}
              aria-pressed={category === cat.slug}
              className={cn(
                "min-h-11 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                category === cat.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:border-gold/50 hover:text-primary"
              )}
            >
              {cat.name}
              <span className="ml-1.5 text-xs opacity-70">({cat.productCount})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No pieces found"
            message={
              q
                ? `We couldn't find anything for "${q}". Try a different word, or browse the collections below.`
                : "This collection is being restocked. Explore our other handcrafted pieces meanwhile."
            }
            action={
              <Button variant="outline" className="h-11" onClick={() => navigate("/products")}>
                View all products
              </Button>
            }
          />
        ) : (
          <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4", isFetching && "opacity-60 transition-opacity")}>
            {items.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !isLoading && !isError ? (
        <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
          <Button
            variant="outline"
            className="size-11 p-0"
            disabled={page <= 1}
            onClick={() => navigate(buildUrl({ category, q, page: page - 1 }), { keepScroll: true })}
            aria-label="Previous page"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {pageNumbers.map((num, i) =>
            num === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground" aria-hidden="true">
                …
              </span>
            ) : (
              <Button
                key={num}
                variant={num === page ? "default" : "outline"}
                className="size-11 p-0"
                onClick={() => navigate(buildUrl({ category, q, page: num }), { keepScroll: true })}
                aria-label={`Page ${num}`}
                aria-current={num === page ? "page" : undefined}
              >
                {num}
              </Button>
            )
          )}
          <Button
            variant="outline"
            className="size-11 p-0"
            disabled={page >= totalPages}
            onClick={() => navigate(buildUrl({ category, q, page: page + 1 }), { keepScroll: true })}
            aria-label="Next page"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      ) : null}
    </Container>
  );
}
