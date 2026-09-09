"use client";

import { useMemo } from "react";
import { Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/site/container";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { InquiryForm } from "@/components/site/inquiry-form";
import { FadeIn } from "@/components/site/fade-in";
import { siteOrigin, socialSameAs } from "@/components/site/seo-helpers";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { trackCallClick, trackWhatsAppClick } from "@/lib/track";
import { useSeo } from "@/lib/seo";

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.527 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.739.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.434-2.889-2.434-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.966 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

export default function ContactView() {
  const settings = useSiteStore((s) => s.settings);
  const origin = siteOrigin();

  const socials = [
    { label: "Instagram", url: settings.instagramUrl, icon: Instagram },
    { label: "Facebook", url: settings.facebookUrl, icon: Facebook },
    { label: "Pinterest", url: settings.pinterestUrl, icon: PinterestIcon },
    { label: "YouTube", url: settings.youtubeUrl, icon: Youtube },
  ].filter((s) => s.url);

  const jsonLd = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: settings.brandName,
        description: settings.defaultMetaDescription,
        url: `${origin}/contact`,
        telephone: settings.phone,
        email: settings.email,
        priceRange: "₹₹",
        address: {
          "@type": "PostalAddress",
          addressLocality: settings.city,
          addressRegion: settings.state,
          addressCountry: "IN",
        },
        areaServed: ["IN", "Worldwide"],
        sameAs: socialSameAs(settings),
      },
    ],
    [settings, origin]
  );

  useSeo({
    title: "Contact Us | Artistic by Khushi",
    description:
      "Get in touch with Artistic by Khushi — call, WhatsApp or send an inquiry. Surat-based resin art studio delivering across India and worldwide.",
    canonical: `${origin}/contact`,
    jsonLd,
  });

  const infoCards = [
    {
      title: "Phone",
      icon: Phone,
      content: settings.phone,
      href: `tel:${settings.phone.replace(/\s/g, "")}`,
      hint: "Mon–Sat, 10am–7pm IST",
      trackClick: () => trackCallClick("contact"),
    },
    {
      title: "WhatsApp",
      icon: MessageCircle,
      content: "Chat with us instantly",
      href: whatsappLink(settings),
      external: true,
      hint: "Fastest way to reach us",
      accent: "text-[#128C7E]",
      trackClick: () => trackWhatsAppClick("contact"),
    },
    {
      title: "Email",
      icon: Mail,
      content: settings.email,
      href: `mailto:${settings.email}`,
      hint: "For detailed briefs & bulk orders",
    },
    {
      title: "Studio",
      icon: MapPin,
      content: `${settings.city}, ${settings.state}, India`,
      hint: settings.serviceAreas,
    },
  ];

  return (
    <Container className="py-8 md:py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />

      <FadeIn>
        <div className="mt-4 max-w-2xl">
          <h1 className="font-display text-3xl leading-tight text-foreground md:text-5xl">
            Let&apos;s Create Something Beautiful
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Questions, custom ideas, bulk orders or just a hello — we&apos;d love to hear from you.
          </p>
        </div>
      </FadeIn>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
        {/* Contact info cards */}
        <FadeIn>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {infoCards.map((card) => {
              const Inner = (
                <>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2.5 text-base font-medium text-foreground">
                      <span className="flex size-9 items-center justify-center rounded-full bg-gold-soft text-terracotta">
                        <card.icon className="size-4.5" aria-hidden="true" />
                      </span>
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`font-medium ${card.accent || "text-primary"}`}>{card.content}</p>
                    {card.hint ? <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p> : null}
                  </CardContent>
                </>
              );
              return card.href ? (
                <a
                  key={card.title}
                  href={card.href}
                  target={card.external ? "_blank" : undefined}
                  rel={card.external ? "noopener noreferrer" : undefined}
                  onClick={card.trackClick}
                  className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  <Card className="h-full transition-all hover:border-gold/40 hover:shadow-md">{Inner}</Card>
                </a>
              ) : (
                <Card key={card.title} className="h-full">
                  {Inner}
                </Card>
              );
            })}
          </div>

          {socials.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-foreground">Follow our craft</h2>
              <div className="mt-3 flex gap-2">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Artistic by Khushi on ${social.label}`}
                    className="flex size-11 items-center justify-center rounded-full border bg-card text-foreground/70 transition-all hover:scale-105 hover:border-gold/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <social.icon className="size-5" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold-soft/30 p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-terracotta" aria-hidden="true" />
            <p className="text-sm text-foreground/80">
              <span className="font-medium">We usually reply within a few hours.</span> Every piece is made to
              order, so allow a few days of crafting time plus delivery.
            </p>
          </div>
        </FadeIn>

        {/* Inquiry form */}
        <FadeIn delay={0.1}>
          <Card className="border-gold/30 shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-2xl text-foreground">Send an Inquiry</CardTitle>
            </CardHeader>
            <CardContent>
              <InquiryForm submitLabel="Send Inquiry" />
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </Container>
  );
}
