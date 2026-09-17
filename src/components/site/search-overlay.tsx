"use client";

/**
 * Instant search overlay (command-palette style).
 *
 * Opens from the header search button. Debounced typeahead against
 * /api/public/search — shows live product thumbnails, categories and journal
 * posts with full keyboard navigation (↑ ↓ Enter Esc). "See all results"
 * hands off to the full search page.
 *
 * The inner component is conditionally mounted, so every open starts with
 * fresh state without any setState-in-effect resets.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Loader2, Package, Search, Sparkles, X } from "lucide-react";
import type { SearchResults } from "@/lib/types";
import { navigate } from "@/lib/router";
import { api } from "@/lib/api-client";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

interface SuggestionItem {
  key: string;
  group: "products" | "categories" | "blogs";
  label: string;
  sublabel: string;
  href: string;
  imageUrl?: string;
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SearchOverlayInner onClose={onClose} />;
}

function SearchOverlayInner({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [fetchedFor, setFetchedFor] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce the query (250ms) so we don't hammer the API per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Autofocus on open.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch suggestions when the debounced query is long enough. All state
  // updates happen inside async callbacks (allowed), never synchronously.
  useEffect(() => {
    if (debounced.length < 2) return;
    let cancelled = false;
    api
      .get<SearchResults>(`/api/public/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => {
        if (!cancelled) {
          setResults(r);
          setFetchedFor(debounced);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults(null);
          setFetchedFor(debounced);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // True while a suggestion fetch for the current query is in flight (or
  // failed silently) — derived, not stored.
  const fetching = debounced.length >= 2 && fetchedFor !== debounced;

  // Flatten results into a navigable list of suggestions.
  const items = useMemo<SuggestionItem[]>(() => {
    if (!results || fetchedFor !== debounced) return [];
    const out: SuggestionItem[] = [];
    for (const p of results.products.slice(0, 5)) {
      out.push({
        key: `p-${p.slug}`,
        group: "products",
        label: p.name,
        sublabel: p.categoryName,
        href: `/product/${p.slug}`,
        imageUrl: p.featuredImageUrl,
      });
    }
    for (const c of results.categories.slice(0, 3)) {
      out.push({
        key: `c-${c.slug}`,
        group: "categories",
        label: c.name,
        sublabel: c.productCount > 0 ? `${c.productCount} piece${c.productCount === 1 ? "" : "s"}` : "Collection",
        href: `/category/${c.slug}`,
      });
    }
    for (const b of results.blogs.slice(0, 3)) {
      out.push({
        key: `b-${b.slug}`,
        group: "blogs",
        label: b.title,
        sublabel: "From the journal",
        href: `/blog/${b.slug}`,
      });
    }
    return out;
  }, [results, fetchedFor, debounced]);

  const go = useCallback(
    (href: string, viaKeyboard: boolean) => {
      track("search_suggest_select", {
        query: debounced.slice(0, 100),
        via: viaKeyboard ? "keyboard" : "click",
      });
      onClose();
      navigate(href);
    },
    [debounced, onClose]
  );

  const seeAll = useCallback(() => {
    if (!debounced) return;
    track("search_see_all", { query: debounced.slice(0, 100) });
    onClose();
    navigate(`/search?q=${encodeURIComponent(debounced)}`);
  }, [debounced, onClose]);

  // Keyboard navigation across the flattened list + "see all" row.
  const showSeeAll = debounced.length >= 2;
  const rowCount = items.length + (showSeeAll ? 1 : 0);
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (rowCount === 0) return;
      setActiveIndex((i) => {
        const dir = e.key === "ArrowDown" ? 1 : -1;
        return (i + dir + rowCount) % rowCount;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < items.length) {
        go(items[activeIndex].href, true);
      } else if (showSeeAll) {
        seeAll();
      }
    }
  };

  // Scroll the active row into view when navigating with the keyboard.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-suggest-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const total =
    fetchedFor === debounced
      ? (results?.products.length ?? 0) + (results?.categories.length ?? 0) + (results?.blogs.length ?? 0)
      : 0;
  const activeIsSeeAll = activeIndex === items.length && showSeeAll;

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label="Search the site"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-espresso/60 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      />

      {/* Panel — anchored under the sticky header, command-palette proportions */}
      <div className="absolute inset-x-0 top-0 mx-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-b-2xl border border-t-0 bg-background shadow-2xl shadow-espresso/30 motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:duration-300 sm:top-20">
        {/* Input row */}
        <div className="flex items-center gap-2 border-b bg-gradient-to-r from-gold-soft/40 via-background to-background px-4 py-3.5">
          <Search className="size-5 shrink-0 text-terracotta" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search pieces, collections, stories…"
            aria-label="Search query"
            autoComplete="off"
            className="h-9 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:hidden"
          />
          {fetching ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search (Esc)"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Suggestions */}
        <div ref={listRef} className="custom-scroll flex-1 overflow-y-auto overscroll-contain p-2">
          {debounced.length < 2 ? (
            <div className="px-4 py-10 text-center">
              <Sparkles className="mx-auto size-6 text-gold" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">
                Start typing to search the whole studio — pieces, collections and journal stories.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {["nameplate", "earrings", "diwali", "gift", "couple"].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="rounded-full border bg-secondary/60 px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-terracotta/40 hover:bg-secondary hover:text-terracotta"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : fetching && items.length === 0 ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex animate-shimmer items-center gap-3 rounded-xl bg-secondary/50 p-2.5">
                  <div className="size-11 rounded-lg bg-secondary" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-2/5 rounded bg-secondary" />
                    <div className="h-2.5 w-1/4 rounded bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">Nothing matched “{debounced}”</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a shorter word — or ask us, custom orders are our specialty.
              </p>
            </div>
          ) : (
            <>
              {(["products", "categories", "blogs"] as const).map((group) => {
                const groupItems = items.filter((i) => i.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group} className="mb-1">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                      {group === "products" ? "Pieces" : group === "categories" ? "Collections" : "From the Journal"}
                    </p>
                    {groupItems.map((item) => {
                      const idx = items.indexOf(item);
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          data-suggest-index={idx}
                          onClick={() => go(item.href, false)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            active ? "bg-secondary" : "hover:bg-secondary/60"
                          )}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              loading="lazy"
                              className="size-11 shrink-0 rounded-lg border object-cover"
                            />
                          ) : (
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gold-soft/50 text-primary">
                              {group === "blogs" ? (
                                <BookOpen className="size-5" aria-hidden="true" />
                              ) : (
                                <Package className="size-5" aria-hidden="true" />
                              )}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{item.label}</span>
                            <span className="block truncate text-xs text-muted-foreground">{item.sublabel}</span>
                          </span>
                          <ArrowRight
                            className={cn(
                              "size-4 shrink-0 text-terracotta transition-all",
                              active ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* See-all row */}
              {showSeeAll ? (
                <button
                  type="button"
                  data-suggest-index={items.length}
                  onMouseEnter={() => setActiveIndex(items.length)}
                  onClick={seeAll}
                  className={cn(
                    "mt-1 flex w-full items-center justify-between rounded-xl border border-dashed px-3 py-2.5 text-sm transition-colors",
                    activeIsSeeAll
                      ? "border-terracotta/50 bg-secondary text-terracotta"
                      : "border-border text-foreground/80 hover:bg-secondary/60"
                  )}
                >
                  <span>
                    See all results for <strong className="font-semibold">“{debounced}”</strong>
                    {total > 0 ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">({total} shown instantly)</span>
                    ) : null}
                  </span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="hidden items-center justify-between border-t bg-secondary/30 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
          <span>
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[10px]">↑</kbd>{" "}
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[10px]">↓</kbd> to browse ·{" "}
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[10px]">Enter</kbd> to open ·{" "}
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-sans text-[10px]">Esc</kbd> to close
          </span>
          <span>Handcrafted with love in Surat</span>
        </div>
      </div>
    </div>
  );
}
