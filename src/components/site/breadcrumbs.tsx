"use client";

import { ChevronRight } from "lucide-react";
import { JsonLdScript } from "@/lib/seo";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

/** Compact breadcrumb bar with BreadcrumbList JSON-LD (visible items only). */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const visible = items.filter((i) => i.label);
  if (visible.length === 0) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: visible.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${origin}${item.href.replace(/^#/, "")}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {visible.map((item, i) => {
          const isLast = i === visible.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="rounded-sm px-1 py-0.5 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {item.label}
                </a>
              ) : (
                <span className={cnBreadcrumb(isLast)} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
      <JsonLdScript data={jsonLd} />
    </nav>
  );
}

function cnBreadcrumb(isLast: boolean) {
  return isLast ? "px-1 py-0.5 font-medium text-foreground" : "px-1 py-0.5";
}
