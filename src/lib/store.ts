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
