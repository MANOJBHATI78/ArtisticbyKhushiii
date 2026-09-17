"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Container } from "@/components/site/container";
import { ProductCard } from "@/components/site/product-card";
import { CategoryCard } from "@/components/site/category-card";
import { BlogCard } from "@/components/site/blog-card";
import { EmptyState } from "@/components/site/empty-state";
import { SectionHeading } from "@/components/site/section-heading";
import { FadeIn } from "@/components/site/fade-in";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useSearch } from "@/lib/queries";
import { navigate, useHashRoute } from "@/lib/router";
import { useSeo } from "@/lib/seo";

const SUGGESTIONS = [
  { label: "Resin Nameplates", href: "/category/resin-nameplates" },
  { label: "Memory Preservation", href: "/category/memory-preservation" },
  { label: "Lippan Art", href: "/category/lippan-art" },
  { label: "Nameplate Design Ideas", href: "/blog/resin-nameplate-design-ideas" },
];

export default function SearchView() {
  const route = useHashRoute();
  const origin = siteOrigin();
  const q = route.query.get("q") || "";
  const [input, setInput] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the input aligned when the URL query changes externally (e.g. back button).
  if (lastQ !== q) {
    setLastQ(q);
    setInput(q);
  }

  const { data, isLoading, isFetching } = useSearch(q);

  useSeo({
    title: q ? `Search: ${q} | Artistic by Khushiii` : "Search | Artistic by Khushiii",
    description: "Search handcrafted resin art products, collections and journal stories.",
    canonical: `${origin}/search`,
    noindex: true,
  });

  // Autofocus on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce input → URL.
  useEffect(() => {
    if (input === q) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate(input.trim() ? `/search?q=${encodeURIComponent(input.trim())}` : "/search", {
        replace: true,
        keepScroll: true,
      });
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [input, q]);

  const products = data?.products || [];
  const categories = data?.categories || [];
  const blogs = data?.blogs || [];
  const totalResults = products.length + categories.length + blogs.length;
  const searching = isLoading || isFetching;
  const hasQuery = q.trim().length > 1;

  return (
    <Container className="py-8 md:py-12">
      <h1 className="text-center font-display text-3xl text-foreground md:text-4xl">Search the Studio</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground md:text-base">
        Find handcrafted pieces, collections and stories.
      </p>

      <div className="relative mx-auto mt-6 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={inputRef}
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Try “nameplate”, “coaster”, “memory”…"
          aria-label="Search the site"
          className="h-14 rounded-full pl-12 pr-12 text-base shadow-sm"
        />
        {input ? (
          <button
            type="button"
            onClick={() => {
              setInput("");
              navigate("/search", { replace: true, keepScroll: true });
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Results */}
      <div className="mt-10">
        {hasQuery ? (
          <p className="mb-6 text-center text-sm text-muted-foreground" aria-live="polite">
            {searching
              ? `Searching for “${q}”…`
              : `${totalResults} ${totalResults === 1 ? "result" : "results"} for “${q}”`}
          </p>
        ) : null}

        {!hasQuery ? (
          <EmptyState
            title="What are you looking for?"
            message="Type a word above — or jump straight to a popular corner of the studio:"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <a
                    key={s.href}
                    href={`#${s.href}`}
                    className="inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm font-medium text-foreground/80 transition-colors hover:border-gold/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            }
          />
        ) : searching ? (
          <div className="mx-auto max-w-md space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-secondary animate-shimmer" />
            ))}
          </div>
        ) : totalResults === 0 ? (
          <EmptyState
            title="Nothing found"
            message={`We couldn't find anything for “${q}”. Try a different word, or tell us what you're dreaming of — custom orders are our specialty.`}
            action={
              <a
                href="#/contact"
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Request a Custom Piece
              </a>
            }
          />
        ) : (
          <div className="space-y-14">
            {products.length > 0 ? (
              <section aria-label="Product results">
                <SectionHeading align="left" eyebrow="Products" title={`Products (${products.length})`} className="mb-6" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
                  {products.map((p) => (
                    <FadeIn key={p.slug}>
                      <ProductCard product={p} />
                    </FadeIn>
                  ))}
                </div>
              </section>
            ) : null}

            {categories.length > 0 ? (
              <section aria-label="Collection results">
                <SectionHeading align="left" eyebrow="Collections" title={`Collections (${categories.length})`} className="mb-6" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {categories.map((c) => (
                    <FadeIn key={c.slug}>
                      <CategoryCard category={c} />
                    </FadeIn>
                  ))}
                </div>
              </section>
            ) : null}

            {blogs.length > 0 ? (
              <section aria-label="Journal results">
                <SectionHeading align="left" eyebrow="The journal" title={`From the Journal (${blogs.length})`} className="mb-6" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {blogs.map((b) => (
                    <FadeIn key={b.slug}>
                      <BlogCard post={b} />
                    </FadeIn>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </Container>
  );
}
