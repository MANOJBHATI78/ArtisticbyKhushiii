"use client";

import { create } from "zustand";
import type { SiteSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

export interface InquiryContext {
  productSlug: string;
  productName: string;
  productUrl: string;
  category: string;
}

interface SiteState {
  settings: SiteSettings;
  settingsLoaded: boolean;
  setSettings: (s: SiteSettings) => void;

  inquiryOpen: boolean;
  inquiryContext: InquiryContext | null;
  openInquiry: (ctx?: InquiryContext | null) => void;
  closeInquiry: () => void;

  lastLeadRef: string;
  setLastLeadRef: (ref: string) => void;

  /** Favourite products (persisted in localStorage). */
  wishlistSlugs: string[];
  toggleWishlist: (slug: string) => void;
  removeFromWishlist: (slug: string) => void;
  clearWishlist: () => void;

  /** Recently viewed product slugs, newest first (persisted, capped). */
  recentSlugs: string[];
  trackRecent: (slug: string) => void;
  removeRecent: (slug: string) => void;
  clearRecent: () => void;
}

const WISHLIST_KEY = "abk_wishlist";
const RECENT_KEY = "abk_recent";
const RECENT_LIMIT = 12;

function readStoredSlugs(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredSlugs(key: string, slugs: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(slugs));
  } catch {
    /* storage unavailable (private mode) — keep in memory only */
  }
}

export const useSiteStore = create<SiteState>((set) => ({
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,
  setSettings: (s) => set({ settings: s, settingsLoaded: true }),

  inquiryOpen: false,
  inquiryContext: null,
  openInquiry: (ctx) =>
    set({ inquiryOpen: true, inquiryContext: ctx ?? null }),
  closeInquiry: () => set({ inquiryOpen: false }),

  lastLeadRef: "",
  setLastLeadRef: (ref) => set({ lastLeadRef: ref }),

  wishlistSlugs: readStoredSlugs(WISHLIST_KEY),
  toggleWishlist: (slug) =>
    set((state) => {
      const has = state.wishlistSlugs.includes(slug);
      const next = has ? state.wishlistSlugs.filter((s) => s !== slug) : [slug, ...state.wishlistSlugs];
      writeStoredSlugs(WISHLIST_KEY, next);
      return { wishlistSlugs: next };
    }),
  removeFromWishlist: (slug) =>
    set((state) => {
      const next = state.wishlistSlugs.filter((s) => s !== slug);
      writeStoredSlugs(WISHLIST_KEY, next);
      return { wishlistSlugs: next };
    }),
  clearWishlist: () => {
    writeStoredSlugs(WISHLIST_KEY, []);
    set({ wishlistSlugs: [] });
  },

  recentSlugs: readStoredSlugs(RECENT_KEY),
  trackRecent: (slug) =>
    set((state) => {
      const next = [slug, ...state.recentSlugs.filter((s) => s !== slug)].slice(0, RECENT_LIMIT);
      writeStoredSlugs(RECENT_KEY, next);
      return { recentSlugs: next };
    }),
  removeRecent: (slug) =>
    set((state) => {
      const next = state.recentSlugs.filter((s) => s !== slug);
      writeStoredSlugs(RECENT_KEY, next);
      return { recentSlugs: next };
    }),
  clearRecent: () => {
    writeStoredSlugs(RECENT_KEY, []);
    set({ recentSlugs: [] });
  },
}));

/** Builds a wa.me link with a pre-filled message. */
export function whatsappLink(settings: SiteSettings, contextProduct?: string): string {
  const number = settings.whatsappNumber.replace(/\D/g, "");
  let message = settings.whatsappMessage;
  if (contextProduct) {
    message = `Hello! I am interested in "${contextProduct}" from Artistic by Khushi. Please share more details.`;
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
