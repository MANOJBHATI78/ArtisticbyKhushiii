 
"use client";

import { useState, type CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImgProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Inline styles (used by the product magnifier for transform-origin). */
  style?: CSSProperties;
  /** Load eagerly (hero / above the fold). */
  eager?: boolean;
  fallbackIcon?: boolean;
}

/**
 * Lazy-loading <img> wrapper with graceful fallback while the
 * image pipeline is warming up or if an image is missing.
 */
export function Img({ src, alt, className, style, eager = false, fallbackIcon = true }: ImgProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-gold-soft via-secondary to-accent/70 text-terracotta/60",
          className
        )}
      >
        {fallbackIcon ? <Sparkles className="size-8 opacity-70" aria-hidden="true" /> : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
