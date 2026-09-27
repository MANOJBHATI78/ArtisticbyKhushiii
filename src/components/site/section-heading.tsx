"use client";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtext?: string;
  align?: "center" | "left";
  className?: string;
  id?: string;
}

/**
 * Reusable section header: eyebrow → display title → gold ornament
 * divider → optional subtext. The ornament is a brand flourish that
 * adds craft detail without clutter.
 */
export function SectionHeading({ eyebrow, title, subtext, align = "center", className, id }: SectionHeadingProps) {
  return (
    <div className={cn("mb-8 md:mb-10", align === "center" ? "text-center" : "text-left", className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-terracotta">{eyebrow}</p>
      ) : null}
      <h2 id={id} className="font-display text-3xl leading-tight text-foreground md:text-4xl">
        {title}
      </h2>
      <div
        className={cn("mt-4 flex", align === "center" ? "justify-center" : "justify-start")}
        aria-hidden="true"
      >
        <span className="ornament-divider">
          <span className="diamond animate-gold-shimmer" />
        </span>
      </div>
      {subtext ? (
        <p className={cn("mt-4 text-base text-muted-foreground md:text-lg", align === "center" && "mx-auto max-w-2xl")}>
          {subtext}
        </p>
      ) : null}
    </div>
  );
}
