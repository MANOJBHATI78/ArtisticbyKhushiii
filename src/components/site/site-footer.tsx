"use client";

import { Facebook, Instagram, Youtube } from "lucide-react";
import { useCategories } from "@/lib/queries";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { navigate } from "@/lib/router";
import { trackCallClick, trackWhatsAppClick } from "@/lib/track";
import { Img } from "@/components/site/img";
import { Container } from "@/components/site/container";

const EXPLORE_LINKS = [
  { label: "Home", href: "/" },
  { label: "All Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "My Favourites", href: "/wishlist" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Search", href: "/search" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/page/privacy-policy" },
  { label: "Terms & Conditions", href: "/page/terms-conditions" },
  { label: "Disclaimer", href: "/page/disclaimer" },
];

const footerLinkClass =
  "rounded-sm text-cream/70 transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.527 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.739.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.434-2.889-2.434-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.966 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

export function SiteFooter() {
  const settings = useSiteStore((s) => s.settings);
  const { data: categories } = useCategories();
  const topCategories = (categories || []).slice(0, 6);

  const socials = [
    { label: "Instagram", url: settings.instagramUrl, icon: Instagram },
    { label: "Facebook", url: settings.facebookUrl, icon: Facebook },
    { label: "Pinterest", url: settings.pinterestUrl, icon: PinterestIcon },
    { label: "YouTube", url: settings.youtubeUrl, icon: Youtube },
  ].filter((s) => s.url);

  return (
    <footer className="mt-auto bg-espresso pb-[env(safe-area-inset-bottom)] text-cream">
      <Container className="py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
              className="inline-block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              aria-label={`${settings.brandName || "Artistic by Khushiii"} — home`}
            >
              <Img
                src={settings.logoUrl}
                alt={`${settings.brandName || "Artistic by Khushiii"} logo`}
                eager
                fallbackIcon={false}
                className="size-16 rounded-lg bg-cream p-1 object-contain"
              />
            </a>
            <p className="mt-4 text-sm leading-relaxed text-cream/70">{settings.footerAbout}</p>
            {socials.length > 0 ? (
              <div className="mt-5 flex gap-2">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.brandName || "Artistic by Khushiii"} on ${social.label}`}
                    className="flex size-11 items-center justify-center rounded-full bg-cream/10 text-cream/80 transition-all hover:scale-105 hover:bg-gold hover:text-espresso focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <social.icon className="size-5" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* Explore */}
          <nav aria-label="Footer explore links">
            <h2 className="font-display text-lg text-cream">Explore</h2>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  {link.href === "/" ? (
                    <a
                      href="/"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/");
                      }}
                      className={`${footerLinkClass} inline-block py-0.5 text-sm`}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <a href={`#${link.href}`} className={`${footerLinkClass} inline-block py-0.5 text-sm`}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Collections */}
          <nav aria-label="Footer collection links">
            <h2 className="font-display text-lg text-cream">Collections</h2>
            <ul className="mt-4 space-y-2.5">
              {topCategories.length > 0 ? (
                topCategories.map((cat) => (
                  <li key={cat.slug}>
                    <a href={`#/category/${cat.slug}`} className={`${footerLinkClass} inline-block py-0.5 text-sm`}>
                      {cat.name}
                    </a>
                  </li>
                ))
              ) : (
                <li>
                  <a href="#/categories" className={`${footerLinkClass} text-sm`}>
                    Browse all collections
                  </a>
                </li>
              )}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className="font-display text-lg text-cream">Get in Touch</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/70">
              <li>
                <a
                  href={`tel:${settings.phone.replace(/\s/g, "")}`}
                  onClick={() => trackCallClick("footer")}
                  className={footerLinkClass}
                >
                  {settings.phone}
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick("footer")}
                  className={footerLinkClass}
                >
                  WhatsApp us
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className={footerLinkClass}>
                  {settings.email}
                </a>
              </li>
              <li>
                {settings.city}
                {settings.state ? `, ${settings.state}` : ""}, India
              </li>
              {settings.serviceAreas ? <li className="text-cream/60">{settings.serviceAreas}</li> : null}
            </ul>
          </div>
        </div>

        {/* Legal + copyright */}
        <div className="mt-12 border-t border-cream/15 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={`#${link.href}`} className={`${footerLinkClass} text-xs`}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-center text-xs text-cream/50 md:text-right">
              © {new Date().getFullYear()} {settings.copyrightText}
              <span className="mx-2 opacity-50">•</span>
              Crafted with <span aria-hidden="true">♥</span>
              <span className="sr-only">love</span> in Surat, India
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <a href="#/admin" className="text-[10px] text-cream/30 transition-colors hover:text-cream/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
              Admin
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
