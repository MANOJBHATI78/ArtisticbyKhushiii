"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Img } from "@/components/site/img";
import { ProductCard } from "@/components/site/product-card";
import { BlogCard } from "@/components/site/blog-card";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { EmptyState, ErrorState } from "@/components/site/empty-state";
import { SectionHeading } from "@/components/site/section-heading";
import { FadeIn } from "@/components/site/fade-in";
import { ReadingProgress } from "@/components/site/reading-progress";
import { ShareRow } from "@/components/site/share-row";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useBlog } from "@/lib/queries";
import { ApiError } from "@/lib/api-client";
import { navigate } from "@/lib/router";
import { splitList } from "@/lib/types";
import { useSeo } from "@/lib/seo";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "section"
  );
}

/** Adds stable ids to h2/h3 (with smooth-scroll offset) and extracts a TOC. */
function processHeadings(html: string): { html: string; toc: TocItem[] } {
  if (typeof window === "undefined") return { html, toc: [] };
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headings = Array.from(doc.querySelectorAll("h2, h3"));
  const toc: TocItem[] = [];
  const used = new Set<string>();
  for (const h of headings) {
    const text = (h.textContent || "").trim();
    if (!text) continue;
    const base = h.id ? h.id : slugifyHeading(text);
    let id = base;
    let n = 2;
    while (used.has(id)) {
      id = `${base}-${n++}`;
    }
    used.add(id);
    h.id = id;
    h.setAttribute("style", "scroll-margin-top: 6rem;");
    toc.push({ id, text, level: h.tagName === "H2" ? 2 : 3 });
  }
  return { html: doc.body.innerHTML, toc };
}

export default function BlogPostView({ slug }: { slug: string }) {
  const { data, isLoading, isError, error, refetch } = useBlog(slug);
  const origin = siteOrigin();
  const [showTocMobile, setShowTocMobile] = useState(false);
  const is404 = error instanceof ApiError && error.status === 404;

  const post = data?.post;
  const processed = useMemo(
    () => (post ? processHeadings(post.content) : { html: "", toc: [] as TocItem[] }),
    [post]
  );
  const tags = post ? splitList(post.tags) : [];

  useSeo({
    title: post?.seoTitle || (post ? `${post.title} | Artistic by Khushi` : "Journal | Artistic by Khushi"),
    description: post?.metaDescription || post?.excerpt,
    canonical: `${origin}/blog/${slug}`,
    ogImage: post?.coverImage,
    ogType: "article",
    jsonLd: useMemo(() => {
      if (!post) return undefined;
      return [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          image: `${origin}${post.coverImage}`,
          datePublished: post.publishedAt || post.createdAt,
          dateModified: post.updatedAt,
          author: { "@type": "Person", name: post.author || "Khushi" },
          publisher: {
            "@type": "Organization",
            name: "Artistic by Khushi",
            logo: { "@type": "ImageObject", url: `${origin}/images/logo.png` },
          },
          mainEntityOfPage: `${origin}/blog/${post.slug}`,
        },
      ];
    }, [post, origin]),
  });

  if (isLoading) {
    return (
      <Container className="py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-40 rounded-full bg-secondary animate-shimmer" />
          <div className="h-10 w-full bg-secondary animate-shimmer" />
          <div className="h-10 w-3/4 bg-secondary animate-shimmer" />
          <div className="aspect-video w-full rounded-xl bg-secondary animate-shimmer" />
          <div className="h-4 w-full bg-secondary animate-shimmer" />
          <div className="h-4 w-5/6 bg-secondary animate-shimmer" />
          <div className="h-4 w-2/3 bg-secondary animate-shimmer" />
        </div>
      </Container>
    );
  }

  if (isError || !post) {
    if (is404) {
      return (
        <Container className="py-16">
          <EmptyState
            title="Story not found"
            message="This article seems to have been moved or unpublished. The journal has plenty more to read."
            action={
              <Button className="h-11" onClick={() => navigate("/blog")}>
                Back to the Journal
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

  const publishDate = post.publishedAt || post.createdAt;
  const authorName = post.author || "Khushi";
  const initials = authorName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setShowTocMobile(false);
  };

  return (
    <>
      <ReadingProgress />
      <Container className="py-8 md:py-12">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            ...(post.blogCategoryName && post.blogCategorySlug
              ? [{ label: post.blogCategoryName, href: `/blog?cat=${post.blogCategorySlug}` }]
              : []),
            { label: post.title },
          ]}
        />

        <article className="mx-auto mt-6 max-w-3xl">
          {post.blogCategoryName ? (
            <a
              href={`#/blog?cat=${post.blogCategorySlug}`}
              className="inline-block rounded-full bg-gold-soft px-3 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-gold/40"
            >
              {post.blogCategoryName}
            </a>
          ) : null}
          <h1 className="mt-3 font-display text-3xl leading-tight text-foreground md:text-5xl">{post.title}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-primary font-display text-sm text-primary-foreground"
              >
                {initials}
              </span>
              By {authorName}
            </span>
            {publishDate ? (
              <time dateTime={new Date(publishDate).toISOString()}>
                <span className="opacity-50">•</span> {format(new Date(publishDate), "d MMM yyyy")}
              </time>
            ) : null}
            <span>
              <span className="opacity-50">•</span> {post.readingTime} min read
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border bg-card">
            <div className="aspect-video bg-secondary">
              <Img src={post.coverImage} alt={post.coverAlt || post.title} eager className="size-full object-cover" />
            </div>
          </div>

          {tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => (
                <a
                  key={t}
                  href={`#/blog?tag=${encodeURIComponent(t)}`}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-gold-soft hover:text-accent-foreground"
                >
                  #{t}
                </a>
              ))}
            </div>
          ) : null}
        </article>

        <div className="mx-auto mt-8 grid max-w-4xl gap-8 lg:grid-cols-[240px_1fr]">
          {/* TOC sidebar */}
          {processed.toc.length > 0 ? (
            <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Table of contents">
              <button
                type="button"
                onClick={() => setShowTocMobile((v) => !v)}
                aria-expanded={showTocMobile}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-gold/50 lg:pointer-events-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:hover:border-0"
              >
                <ListTree className="size-4 text-terracotta" aria-hidden="true" />
                On this page
              </button>
              <nav className={showTocMobile ? "mt-3 block" : "hidden lg:block"}>
                <ol className="space-y-1 border-l-2 border-gold/30 pl-4">
                  {processed.toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? "pl-3" : ""}>
                      <button
                        type="button"
                        onClick={() => scrollTo(item.id)}
                        className="block rounded-sm py-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-gold"
                      >
                        {item.text}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          ) : null}

          {/* Article body + share */}
          <div>
            <div className="prose-content" dangerouslySetInnerHTML={{ __html: processed.html }} />

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <span className="text-sm font-medium text-foreground">Share this story:</span>
              <ShareRow
                url={`/blog/${post.slug}`}
                title={post.title}
                message={`A lovely read from Artistic by Khushi: "${post.title}"`}
                image={post.coverImage?.startsWith("http") ? post.coverImage : `${window.location.origin}${post.coverImage}`}
                context="blog"
                label={null}
              />
            </div>
          </div>
        </div>
      </Container>

      {/* Related products */}
      {data?.relatedProducts && data.relatedProducts.length > 0 ? (
        <section aria-label="Pieces from this story" className="bg-secondary/50 py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="Shop the story" title="Pieces From This Story" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
                {data.relatedProducts.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Related blogs */}
      {data?.relatedBlogs && data.relatedBlogs.length > 0 ? (
        <section aria-label="More from the journal" className="py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="Keep reading" title="More From the Journal" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {data.relatedBlogs.map((b) => (
                  <BlogCard key={b.slug} post={b} />
                ))}
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}

      {/* Post FAQs */}
      {data?.faqs && data.faqs.length > 0 ? (
        <section aria-label="Questions" className="bg-secondary/50 py-14 md:py-20">
          <Container>
            <FadeIn>
              <SectionHeading eyebrow="Quick answers" title="You Might Ask" />
              <div className="mx-auto max-w-3xl rounded-2xl border bg-card px-4 py-2 md:px-6">
                <FaqAccordion faqs={data.faqs} withSchema />
              </div>
            </FadeIn>
          </Container>
        </section>
      ) : null}
    </>
  );
}
