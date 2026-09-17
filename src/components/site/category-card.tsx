"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Img } from "@/components/site/img";
import type { PublicCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: PublicCategory;
  className?: string;
}

/** Collection card — image, name, product count, short description, "Explore →". */
export function CategoryCard({ category, className }: CategoryCardProps) {
  return (
    <Card
      className={cn(
        "group h-full overflow-hidden pt-0 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-lg",
        className
      )}
    >
      <a
        href={`#/category/${category.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
        aria-label={`Explore ${category.name}`}
      >
        <div className="aspect-[4/3] overflow-hidden bg-secondary max-sm:aspect-square max-sm:p-3">
          <Img
            src={category.imageUrl}
            alt={category.imageAlt || category.name}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] max-sm:object-contain max-sm:transition-none max-sm:group-hover:scale-100"
          />
        </div>
        <CardContent className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg leading-snug text-foreground transition-colors group-hover:text-primary">
              {category.name}
            </h3>
            {typeof category.productCount === "number" ? (
              <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {category.productCount} {category.productCount === 1 ? "design" : "designs"}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{category.shortDescription}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-terracotta transition-transform duration-300 group-hover:translate-x-1">
            Explore
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </CardContent>
      </a>
    </Card>
  );
}
