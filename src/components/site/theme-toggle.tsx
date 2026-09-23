"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { track } from "@/lib/track";

/**
 * Light/dark theme toggle — cosy chocolate-dark palette for evening browsing.
 * Uses next-themes (persisted in localStorage, applied as <html class="dark">).
 *
 * Hydration-safe without a "mounted" state: next-themes leaves resolvedTheme
 * undefined on the server AND the first client render, so that doubles as the
 * "not mounted yet" signal — the button shows a neutral shell until then.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const mounted = resolvedTheme !== undefined;
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        const next = isDark ? "light" : "dark";
        setTheme(next);
        track("theme_toggle", { theme: next });
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex size-10 items-center justify-center rounded-full text-foreground/80 transition-all hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 ${className}`}
    >
      {mounted ? (
        <span className="relative block size-5" aria-hidden="true">
          <Sun
            className={`absolute inset-0 size-5 transition-all duration-300 ${
              isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <Moon
            className={`absolute inset-0 size-5 transition-all duration-300 ${
              isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
            }`}
          />
        </span>
      ) : (
        <span className="block size-5 rounded-full border border-border" aria-hidden="true" />
      )}
    </button>
  );
}
