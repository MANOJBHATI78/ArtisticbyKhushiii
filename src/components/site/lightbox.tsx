"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Img } from "@/components/site/img";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  url: string;
  alt: string;
  caption?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Full-screen image viewer — keyboard (←/→/Esc), prev/next buttons,
 * image counter and caption. Used for product galleries & wishlists.
 */
export function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const open = index !== null && images.length > 0;

  const goPrev = useCallback(() => {
    if (index === null) return;
    onNavigate((index - 1 + images.length) % images.length);
  }, [index, images.length, onNavigate]);

  const goNext = useCallback(() => {
    if (index === null) return;
    onNavigate((index + 1) % images.length);
  }, [index, images.length, onNavigate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext]);

  if (!open || index === null) return null;
  const current = images[index];

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent
        className="max-w-[min(92vw,1100px)] border-border/60 bg-espresso/95 p-0 backdrop-blur-md sm:rounded-2xl"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{current.alt}</DialogTitle>
        <div className="relative flex min-h-[60vh] items-center justify-center p-4 sm:p-8">
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image viewer"
            className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full bg-card/15 text-cream backdrop-blur-sm transition-colors hover:bg-card/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          {/* Prev / Next */}
          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/15 text-cream backdrop-blur-sm transition-all hover:bg-card/30 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:left-5"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/15 text-cream backdrop-blur-sm transition-all hover:bg-card/30 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:right-5"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </>
          ) : null}

          {/* Image */}
          <figure className="flex max-h-[82vh] w-full flex-col items-center gap-3">
            <Img
              src={current.url}
              alt={current.alt}
              eager
              fallbackIcon={false}
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            {current.caption ? (
              <figcaption className="max-w-xl text-center text-sm text-cream/75">{current.caption}</figcaption>
            ) : null}
          </figure>

          {/* Counter */}
          {images.length > 1 ? (
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card/15 px-3.5 py-1 text-xs font-medium tabular-nums text-cream/90 backdrop-blur-sm">
              {index + 1} / {images.length}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Subtle "click to zoom" affordance shown on hover over gallery images. */
export function ZoomHint({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-card/85 text-foreground/70 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100",
        className
      )}
      aria-hidden="true"
    >
      <Maximize2 className="size-4" />
    </span>
  );
}
