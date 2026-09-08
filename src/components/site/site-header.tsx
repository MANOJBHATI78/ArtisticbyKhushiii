"use client";

import { useState } from "react";
import { Menu, Phone, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Container } from "@/components/site/container";
import { Img } from "@/components/site/img";
import { navigate, useHashRoute } from "@/lib/router";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const ANNOUNCEMENT_KEY = "abk_announcement_dismissed";

export function SiteHeader() {
  const settings = useSiteStore((s) => s.settings);
  const settingsLoaded = useSiteStore((s) => s.settingsLoaded);
  const openInquiry = useSiteStore((s) => s.openInquiry);
  const route = useHashRoute();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Dismissed announcements stay hidden for the whole browsing session.
  const [announcementDismissed, setAnnouncementDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(ANNOUNCEMENT_KEY) === "1";
    } catch {
      return false;
    }
  });

  const dismissAnnouncement = () => {
    try {
      sessionStorage.setItem(ANNOUNCEMENT_KEY, "1");
    } catch {
      /* private mode — ignore */
    }
    setAnnouncementDismissed(true);
  };

  const isActive = (href: string) => {
    if (href === "/") return route.path === "/";
    return route.path === href || route.path.startsWith(`${href}/`);
  };

  const showAnnouncement = settingsLoaded && settings.announcements && !announcementDismissed;

  return (
    <header className="sticky top-0 z-40 w-full">
      {showAnnouncement ? (
        <div className="relative flex items-center justify-center bg-primary px-10 py-1.5 text-center">
          <p className="truncate text-sm text-primary-foreground">{settings.announcements}</p>
          <button
            type="button"
            onClick={dismissAnnouncement}
            aria-label="Dismiss announcement"
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="border-b bg-background/90 backdrop-blur-md">
        <Container>
          <div className="flex h-16 items-center justify-between gap-3 md:h-20">
            {/* Logo + wordmark */}
            <a
              href="#/"
              className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              aria-label="Artistic by Khushi — home"
            >
              {settingsLoaded ? (
                <Img
                  src={settings.logoUrl}
                  alt="Artistic by Khushi logo"
                  eager
                  fallbackIcon={false}
                  className="size-11 rounded-lg bg-primary object-cover"
                />
              ) : (
                <div className="size-11 animate-shimmer rounded-lg bg-secondary" aria-hidden="true" />
              )}
              <span className="hidden font-display text-lg leading-tight text-foreground min-[420px]:block sm:text-xl">
                {settings.brandName || "Artistic by Khushi"}
              </span>
            </a>

            {/* Desktop nav */}
            <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={`#${link.href}`}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                    isActive(link.href)
                      ? "text-primary underline decoration-gold decoration-2 underline-offset-8"
                      : "text-foreground/80"
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/search")}
                aria-label="Search the site"
                className="flex size-11 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <Search className="size-5" aria-hidden="true" />
              </button>

              <Button
                className="hidden h-11 rounded-full px-5 md:inline-flex"
                onClick={() => openInquiry(null)}
              >
                {settings.headerCtaText || "Enquire Now"}
              </Button>

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:hidden"
              >
                <Menu className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </Container>
      </div>

      {/* Mobile navigation sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto custom-scroll">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-left font-display text-xl">Menu</SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
          </SheetHeader>
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1 px-4 pb-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={`#${link.href}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  isActive(link.href) ? "bg-gold-soft/60 text-primary" : "text-foreground"
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3 px-4 pb-6">
            <Button
              className="h-12 w-full rounded-full"
              onClick={() => {
                setMobileOpen(false);
                openInquiry(null);
              }}
            >
              {settings.headerCtaText || "Enquire Now"}
            </Button>
            <div className="flex gap-3">
              <Button asChild variant="outline" className="h-12 flex-1">
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} aria-label={`Call us on ${settings.phone}`}>
                  <Phone aria-hidden="true" />
                  Call
                </a>
              </Button>
              <Button asChild variant="outline" className="h-12 flex-1 text-[#128C7E]">
                <a
                  href={whatsappLink(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat with us on WhatsApp"
                >
                  WhatsApp
                </a>
              </Button>
            </div>
            <p className="pt-1 text-center text-xs text-muted-foreground">
              {settings.city}, {settings.state} — pan-India & worldwide shipping
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
