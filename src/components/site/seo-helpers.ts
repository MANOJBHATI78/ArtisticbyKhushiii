"use client";

/** Small shared helpers for building JSON-LD + canonical URLs. */
import type { SiteSettings } from "@/lib/types";

export function siteOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/** Social profile URLs actually configured in settings. */
export function socialSameAs(settings: SiteSettings): string[] {
  return [settings.instagramUrl, settings.facebookUrl, settings.pinterestUrl, settings.youtubeUrl].filter(Boolean);
}
