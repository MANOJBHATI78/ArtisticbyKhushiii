"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { BlogCard } from "@/components/site/blog-card";
import { Img } from "@/components/site/img";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { BlogGridSkeleton } from "@/components/site/skeletons";
import { siteOrigin } from "@/components/site/seo-helpers";
import { api } from "@/lib/api-client";
import { useBlogCategories, useBlogs } from "@/lib/queries";
import { navigate, useHashRoute } from "@/lib/router";
import { splitList, type Paginated, type PublicBlogPost } from "@/lib/types";
import { useSeo } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 9;

/** Chip row shows a scrollbar-free horizontal scroll on mobile. */
const NO_SCROLLBAR = "[scrollbar-width:none] [ -ms-overflow-style:none ] [&::-webkit-scrollbar]:hidden";

const chipClass = (active: boolean) =>
  cn(
    "min-h-11 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground/80 hover:border-gold/50 hover:text-primary"
  );

/**
 * Small extension hook (kept local per file-ownership): unfiltered first page
 * of posts so the tag chips stay stable even while a tag filter is active.
 * Shares the ["blogs", …] key prefix, so admin invalidation refreshes it too.
 */
function useAllBlogTags() {
  const { data } = useQuery({
    queryKey: ["blogs", "tags"],
    queryFn: () => api.get<Paginated<PublicBlogPost>>("/api/public/blogs?page=1&pageSize=48"),
    staleTime: 1000 * 60 * 5,
  });
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of data?.items || []) {
      for (const t of splitList(post.tags)) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => t);
  }, [data]);
}

function buildUrl(params: { q?: string; tag?: string; cat?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.tag) sp.set("tag", params.tag);
  if (params.cat) sp.set("cat", params.cat);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return `/blog${qs ? `?${qs}` : ""}`;
}

export default function BlogView() {
  const route = useHashRoute();
  const origin = siteOrigin();
  const q = route.query.get("q") || "";
  const tag = route.query.get("tag") || "";
  const cat = route.query.get("cat") || "";
  const page = Math.max(1, Number(route.query.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input aligned when the URL query changes externally (e.g. back button).
  if (lastQ !== q) {
    setLastQ(q);
    setSearchInput(q);
  }

  const { data: blogCategories } = useBlogCategories();
  const { data, isLoading, isError, refetch, isFetching } = useBlogs(page, PAGE_SIZE, q, tag, cat);
  const allTags = useAllBlogTags();

  useSeo({
    title: "Blog | Artistic by Khushiii — Resin Art Journal",
    description:
      "Care guides, design ideas and behind-the-scenes stories from the Artistic by Khushiii resin art studio in Surat.",
    canonical: `${origin}/blog`,
  });

  useEffect(() => {
    if (searchInput === q) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      navigate(buildUrl({ q: searchInput.trim(), tag, cat }), { replace: true, keepScroll: true });
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchInput, q, tag, cat]);

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const featured = !q && !tag && !cat && page === 1 ? items.find((p) => p.featured) : undefined;
  const rest = featured ? items.filter((p) => p.slug !== featured.slug) : items;

  const hasFilters = q || tag || cat;
  const activeCat = blogCategories?.find((c) => c.slug === cat);

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
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">
            {activeCat ? activeCat.name : "The Artistic Journal"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            Care guides, design ideas and studio stories — written by Khushi.
          </p>
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            className="h-11 pl-9 pr-10"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                navigate(buildUrl({ tag, cat }), { replace: true, keepScroll: true });
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Filters: blog categories + tag chips (scrollable, no scrollbar) */}
      <div
        className={cn("mt-6 -mx-4 space-y-2 overflow-x-auto px-4 pb-1", NO_SCROLLBAR)}
        aria-label="Filter articles"
      >
        <div className="flex w-max gap-2">
          <button
            type="button"
            onClick={() => navigate(buildUrl({ q, tag }), { keepScroll: true })}
            aria-pressed={!cat}
            className={chipClass(!cat)}
          >
            All Topics
          </button>
          {(blogCategories || []).map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => navigate(buildUrl({ q, tag, cat: c.slug }), { keepScroll: true })}
              aria-pressed={cat === c.slug}
              className={chipClass(cat === c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
        {allTags.length > 0 ? (
          <div className="flex w-max items-center gap-2 pt-1" role="group" aria-label="Filter by tag">
            <button
              type="button"
              onClick={() => navigate(buildUrl({ q, cat }), { keepScroll: true })}
              aria-pressed={!tag}
              className={chipClass(!tag)}
            >
              All tags
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => navigate(buildUrl({ q, cat, tag: t }), { keepScroll: true })}
                aria-pressed={tag === t}
                className={chipClass(tag === t)}
              >
                #{t}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <BlogGridSkeleton count={6} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No articles found"
            message={hasFilters ? "Try a different search or clear the filters — fresh stories land regularly." : "The journal is being written — check back soon."}
            action={
              hasFilters ? (
                <Button variant="outline" className="h-11" onClick={() => navigate("/blog")}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={cn(isFetching && "opacity-60 transition-opacity")}>
            {featured ? (
              <a
                href={`#/blog/${featured.slug}`}
                className="group mb-8 grid gap-0 overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold md:grid-cols-2"
              >
                <div className="aspect-[16/10] overflow-hidden bg-secondary md:aspect-auto md:min-h-64">
                  <Img
                    src={featured.coverImage}
                    alt={featured.coverAlt || featured.title}
                    eager
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-col justify-center p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {featured.blogCategoryName ? (
                      <span className="rounded-full bg-gold-soft px-2 py-0.5 font-medium text-accent-foreground">
                        {featured.blogCategoryName}
                      </span>
                    ) : null}
                    <span>Featured story</span>
                    <span className="opacity-50">•</span>
                    <span>{featured.readingTime} min read</span>
                  </div>
                  <h2 className="mt-3 font-display text-2xl leading-snug text-foreground transition-colors group-hover:text-primary md:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3 md:text-base">{featured.excerpt}</p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    By {featured.author || "Khushi"}
                    {featured.publishedAt ? ` • ${format(new Date(featured.publishedAt), "d MMM yyyy")}` : ""}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-terracotta">
                    Read Article →
                  </span>
                </div>
              </a>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {rest.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
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
            onClick={() => navigate(buildUrl({ q, tag, cat, page: page - 1 }), { keepScroll: true })}
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
                onClick={() => navigate(buildUrl({ q, tag, cat, page: num }), { keepScroll: true })}
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
            onClick={() => navigate(buildUrl({ q, tag, cat, page: page + 1 }), { keepScroll: true })}
            aria-label="Next page"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      ) : null}
    </Container>
  );
}
