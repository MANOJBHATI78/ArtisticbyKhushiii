"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Slim gold reading-progress bar pinned under the sticky header. Tracks how
 * far the visitor has scrolled through the whole page — a classic journal
 * flourish that stays out of the way.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      // 0…1 — clamped so short pages (nothing to scroll) show a full bar.
      setProgress(scrollable > 40 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-[3px] bg-transparent"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-gold via-terracotta to-gold"
        initial={false}
        animate={{ width: `${progress * 100}%` }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.15, ease: "easeOut" }}
      />
    </div>
  );
}
