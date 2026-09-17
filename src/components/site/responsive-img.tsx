"use client";

import { Img } from "@/components/site/img";

interface ResponsiveImgProps {
  /** Desktop (≥768px) image source. */
  src?: string | null;
  /** Optional separate image for small screens (<768px). Falls back to src. */
  mobileSrc?: string | null;
  alt: string;
  className?: string;
  /** Load eagerly (above the fold). */
  eager?: boolean;
  fallbackIcon?: boolean;
}

/**
 * Mobile-aware image: renders a <picture> with a mobile <source> when a
 * dedicated mobile image exists, otherwise a plain <img>. Owners can upload
 * a portrait/tighter crop for phones without touching the desktop banner.
 */
export function ResponsiveImg({
  src,
  mobileSrc,
  alt,
  className,
  eager = false,
  fallbackIcon = true,
}: ResponsiveImgProps) {
  const mobile = mobileSrc?.trim();
  if (!mobile || mobile === src) {
    return <Img src={src} alt={alt} className={className} eager={eager} fallbackIcon={fallbackIcon} />;
  }
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobile} />
      <Img src={src} alt={alt} className={className} eager={eager} fallbackIcon={fallbackIcon} />
    </picture>
  );
}
