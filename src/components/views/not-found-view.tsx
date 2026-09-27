"use client";

import { ArrowRight, Home } from "lucide-react";
import { Container } from "@/components/site/container";
import { FadeIn } from "@/components/site/fade-in";
import { siteOrigin } from "@/components/site/seo-helpers";
import { useSeo } from "@/lib/seo";
import { navigate } from "@/lib/router";

const LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "All Products", href: "/products", icon: ArrowRight },
  { label: "Categories", href: "/categories", icon: ArrowRight },
  { label: "Journal", href: "/blog", icon: ArrowRight },
  { label: "Contact", href: "/contact", icon: ArrowRight },
  { label: "Search", href: "/search", icon: ArrowRight },
];

export default function NotFoundView() {
  const origin = siteOrigin();

  useSeo({
    title: "Page Not Found | Artistic by Khushiii",
    description: "The page you're looking for has wandered off. Explore our handcrafted resin art instead.",
    canonical: `${origin}/404`,
    noindex: true,
  });

  return (
    <Container className="flex flex-col items-center py-20 text-center md:py-28">
      <FadeIn>
        <div className="mx-auto max-w-xl">
          <p className="font-display text-6xl text-gold">404</p>
          <h1 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-4xl">
            Page Not Found
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            This page seems to have wandered off — like glitter in the studio. Let&apos;s get you back to the
            beautiful things.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href === "/" ? "/" : `#${link.href}`}
                onClick={
                  link.href === "/"
                    ? (e) => {
                        e.preventDefault();
                        navigate("/");
                      }
                    : undefined
                }
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-foreground/80 transition-all hover:border-gold/50 hover:text-primary hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <link.icon className="size-4" aria-hidden="true" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </FadeIn>
    </Container>
  );
}
