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

/** Reusable section header: eyebrow → display title → optional subtext. */
export function SectionHeading({ eyebrow, title, subtext, align = "center", className, id }: SectionHeadingProps) {
  return (
    <div className={cn("mb-8 md:mb-10", align === "center" ? "text-center" : "text-left", className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-terracotta">{eyebrow}</p>
      ) : null}
      <h2 id={id} className="font-display text-3xl leading-tight text-foreground md:text-4xl">
        {title}
      </h2>
      {subtext ? (
        <p className={cn("mt-3 text-base text-muted-foreground md:text-lg", align === "center" && "mx-auto max-w-2xl")}>
          {subtext}
        </p>
      ) : null}
    </div>
  );
}
