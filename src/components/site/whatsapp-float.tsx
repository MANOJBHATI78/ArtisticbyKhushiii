"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Phone } from "lucide-react";
import { useSiteStore, whatsappLink } from "@/lib/store";
import { trackCallClick, trackWhatsAppClick } from "@/lib/track";

/** Floating contact stack — call button above the WhatsApp chat button. */
export function WhatsAppFloat() {
  const settings = useSiteStore((s) => s.settings);
  const href = whatsappLink(settings);
  const reducedMotion = useReducedMotion();
  const telHref = `tel:${(settings.phone || "").replace(/\s/g, "")}`;
  const canCall = Boolean((settings.phone || "").trim());

  return (
    <div className="print-hide fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-50 flex flex-col items-center gap-3">
      {/* Direct call button (terracotta) — sits above WhatsApp */}
      {canCall ? (
        <a
          href={telHref}
          aria-label={`Call ${settings.brandName || "us"} directly`}
          onClick={() => trackCallClick("float")}
          className="group relative flex size-12 items-center justify-center rounded-full bg-terracotta text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform duration-300 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-safe:animate-[float-soft_5s_ease-in-out_infinite]"
        >
          <Phone className="size-5" aria-hidden="true" />
          {/* Desktop-only hover tooltip */}
          <span className="pointer-events-none absolute right-14 hidden whitespace-nowrap rounded-full bg-espresso px-3 py-1.5 text-xs font-medium text-cream opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
            Call us directly
          </span>
        </a>
      ) : null}

      {/* WhatsApp chat button (official green) with a gentle pulse ring */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        onClick={() => trackWhatsAppClick("float")}
        className="group relative flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.45)] transition-transform duration-300 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {/* Gentle expanding ring — subtle, ~2.8s loop, skipped for reduced motion. */}
        {!reducedMotion ? (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#25D366]"
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: [1, 1.4], opacity: [0.55, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
          />
        ) : null}
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-7" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
        {/* Desktop-only hover tooltip (hover-capable devices; hidden on touch/mobile). */}
        <span className="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded-full bg-espresso px-3 py-1.5 text-xs font-medium text-cream opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
          Chat with us on WhatsApp
        </span>
      </a>
    </div>
  );
}
