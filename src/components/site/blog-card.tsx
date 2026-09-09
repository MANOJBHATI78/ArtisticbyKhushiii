"use client";

import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Img } from "@/components/site/img";
import type { PublicBlogPost } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BlogCardProps {
  post: PublicBlogPost;
  className?: string;
}

/** Journal card — cover, category chip + reading time, title, excerpt, author + date. */
export function BlogCard({ post, className }: BlogCardProps) {
  const date = post.publishedAt || post.createdAt;
  const dateLabel = date ? format(new Date(date), "d MMM yyyy") : "";

  return (
    <Card
      className={cn(
        "group h-full overflow-hidden pt-0 transition-all duration-300 hover:border-gold/40 hover:shadow-lg",
        className
      )}
    >
      <a
        href={`#/blog/${post.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
        aria-label={`Read ${post.title}`}
      >
        <div className="aspect-[16/10] overflow-hidden bg-secondary">
          <Img
            src={post.coverImage}
            alt={post.coverAlt || post.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {post.blogCategoryName ? (
              <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {post.blogCategoryName}
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">{post.readingTime} min read</span>
          </div>
          <h3 className="mt-3 font-display text-lg leading-snug text-foreground transition-colors group-hover:text-primary">
            <span className="line-clamp-2">{post.title}</span>
          </h3>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              By {post.author || "Khushi"}
              {dateLabel ? <span className="mx-1.5 opacity-50">•</span> : null}
              {dateLabel}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-terracotta transition-transform duration-300 group-hover:translate-x-1">
              Read
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </CardContent>
      </a>
    </Card>
  );
}
