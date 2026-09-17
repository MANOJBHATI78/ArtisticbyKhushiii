"use client";

import { CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/container";
import { FadeIn } from "@/components/site/fade-in";
import { siteOrigin } from "@/components/site/seo-helpers";
import { navigate } from "@/lib/router";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { useSeo } from "@/lib/seo";

export default function ThankYouView() {
  const settings = useSiteStore((s) => s.settings);
  const lastLeadRef = useSiteStore((s) => s.lastLeadRef);
  const origin = siteOrigin();

  useSeo({
    title: "Thank You | Artistic by Khushi",
    description: "Your inquiry has been received — Artistic by Khushi will be in touch soon.",
    canonical: `${origin}/thank-you`,
    noindex: true,
  });

  return (
    <Container className="flex flex-col items-center justify-center py-20 text-center md:py-28">
      <FadeIn>
        <div className="mx-auto flex max-w-xl flex-col items-center">
          {/* Celebratory check — soft gold ring ripples outward (motion-safe). */}
          <span className="relative flex size-20 items-center justify-center rounded-full bg-gold-soft">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-gold/60 motion-safe:animate-[sparkle-ring_2.4s_ease-out_infinite]"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-gold/40 motion-safe:animate-[sparkle-ring_2.4s_ease-out_infinite_0.8s]"
            />
            <CheckCircle2 className="size-10 text-gold" aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-display text-3xl leading-tight text-foreground md:text-4xl">
            Thank you! Your inquiry has been received.
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            We&apos;ll contact you soon — usually within a few hours. Every reply comes straight from the studio,
            not a bot.
          </p>

          {lastLeadRef ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-gold" aria-hidden="true" />
              Reference: <span className="font-medium text-foreground">{lastLeadRef}</span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="h-12 rounded-full bg-[#25D366] px-7 text-base text-white hover:bg-[#25D366]/90" asChild>
              <a href={whatsappLink(settings)} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                Chat on WhatsApp
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full px-7 text-base"
              onClick={() => navigate("/products")}
            >
              Continue Browsing
            </Button>
          </div>

          {/* Gentle reassurance row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>✦ Handmade to order</span>
            <span aria-hidden="true" className="opacity-40">•</span>
            <span>✦ Pan-India & worldwide shipping</span>
            <span aria-hidden="true" className="opacity-40">•</span>
            <span>✦ Surat, Gujarat studio</span>
          </div>
        </div>
      </FadeIn>
    </Container>
  );
}
