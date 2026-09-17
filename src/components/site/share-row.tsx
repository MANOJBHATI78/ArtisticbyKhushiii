"use client";

import { useState } from "react";
import { Check, Facebook, Link2, MessageCircle, Pin, Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackShareClick } from "@/lib/track";
import { cn } from "@/lib/utils";

/**
 * Reusable social share row — WhatsApp, Facebook, Pinterest, X and copy-link.
 * Used on product pages ("Share this piece") and blog posts.
 * All targets open in new tabs; GA `share_click` event fires per network.
 */
export interface ShareRowProps {
  /** Absolute or hash URL that gets shared (e.g. /product/x). */
  url: string;
  /** Human title of the thing being shared. */
  title: string;
  /** Extra prefill text for WhatsApp (defaults to just the title). */
  message?: string;
  /** Absolute image URL — required for a rich Pinterest pin. */
  image?: string;
  /** Where this row lives — only used for GA context. */
  context: string;
  /** Show a leading label (default "Share:"). */
  label?: string | null;
  className?: string;
}

export function ShareRow({ url, title, message, image, context, label = "Share:", className }: ShareRowProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const absolute = url.startsWith("http") ? url : `${typeof window === "undefined" ? "" : window.location.origin}${url}`;
  const text = message ? `${message}` : title;
  const encodedUrl = encodeURIComponent(absolute);
  const encodedText = encodeURIComponent(text);

  const links: {
    key: "whatsapp" | "facebook" | "pinterest" | "x";
    href: string;
    label: string;
    icon: typeof MessageCircle;
    hover: string;
  }[] = [
    {
      key: "whatsapp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} — ${absolute}`)}`,
      label: "Share on WhatsApp",
      icon: MessageCircle,
      hover: "hover:border-[#25D366]/60 hover:text-[#128C7E] hover:bg-[#25D366]/10",
    },
    {
      key: "facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      label: "Share on Facebook",
      icon: Facebook,
      hover: "hover:border-[#1877F2]/50 hover:text-[#1877F2] hover:bg-[#1877F2]/10",
    },
    ...(image
      ? [
          {
            key: "pinterest" as const,
            href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(image)}&description=${encodedText}`,
            label: "Pin on Pinterest",
            icon: Pin,
            hover: "hover:border-[#E60023]/50 hover:text-[#E60023] hover:bg-[#E60023]/10",
          },
        ]
      : []),
    {
      key: "x",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      label: "Share on X",
      icon: Twitter,
      hover: "hover:border-foreground/40 hover:bg-secondary",
    },
  ];

  async function copyLink() {
    trackShareClick("copy", context);
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast({ title: "Link copied", description: "Paste it anywhere to share." });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: absolute, duration: 8000 });
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {label ? <span className="mr-1 text-sm font-medium text-foreground">{label}</span> : null}
      {links.map(({ key, href, label: ariaLabel, icon: Icon, hover }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          onClick={() => trackShareClick(key, context)}
          className={cn(
            "flex size-11 items-center justify-center rounded-full border bg-card text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
            hover
          )}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        className="flex size-11 items-center justify-center rounded-full border bg-card text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:text-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {copied ? <Check className="size-[18px] text-green-700" aria-hidden="true" /> : <Link2 className="size-[18px]" aria-hidden="true" />}
      </button>
    </div>
  );
}
