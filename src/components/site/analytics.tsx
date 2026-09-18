"use client";

import { useEffect, useRef } from "react";
import type { SiteSettings } from "@/lib/types";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
    /** Debug handle so QA/owner can confirm what is live in DevTools console. */
    __abkAnalytics?: { ga?: string; clarity?: string; gsc?: string };
  }
}

/** GA4 measurement IDs look like G-ABC1234567. */
const GA_ID_RE = /^G-[A-Z0-9]{6,12}$/i;
/** Clarity project IDs are 8–12 alphanumeric chars. */
const CLARITY_ID_RE = /^[A-Z0-9]{6,16}$/i;

/**
 * Google Search Console "HTML tag" method gives a full meta tag; owners often
 * paste the whole tag. Accept: full tag, `google-site-verification=token`,
 * or the bare content token.
 */
function extractGscToken(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const metaContent = t.match(/content\s*=\s*["']([^"']+)["']/i);
  if (metaContent) return metaContent[1].trim();
  const pair = t.match(/google-site-verification\s*=\s*(.+)$/i);
  if (pair) return pair[1].trim();
  return t;
}

/** Skip third-party pings when hacking locally (keeps the dev console clean). */
function isLocalDev(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0";
}

function upsertScript(id: string, src: string): HTMLScriptElement {
  const existing = document.getElementById(id);
  if (existing) {
    existing.setAttribute("src", src);
    return existing as HTMLScriptElement;
  }
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
  return s;
}

function removeScript(id: string) {
  document.getElementById(id)?.remove();
}

/**
 * Injects third-party analytics on the PUBLIC site only (never in #/admin):
 *  • Google Analytics 4 — gtag.js + manual page_view on every hash navigation
 *    (GA's automatic history listener doesn't fire for hash routers).
 *  • Google Search Console — `google-site-verification` meta tag.
 *  • Microsoft Clarity — official tag snippet (session recordings & heatmaps).
 *
 * Everything is driven by SiteSettings saved from the admin panel — a value
 * cleared there is also removed from the live page.
 */
export function SiteAnalytics({ settings }: { settings: SiteSettings }) {
  const gaId = settings.googleAnalyticsId.trim();
  const clarityId = settings.microsoftClarityProjectId.trim();
  const gscToken = extractGscToken(settings.googleSearchConsoleToken);
  const applied = useRef({ ga: "", clarity: "", gsc: "" });
  const dev = isLocalDev();

  // ---------- Google Search Console verification meta tag ----------
  useEffect(() => {
    const elId = "abk-gsc-verification";
    const existing = document.getElementById(elId) as HTMLMetaElement | null;
    if (!gscToken) {
      existing?.remove();
      applied.current.gsc = "";
      return;
    }
    if (applied.current.gsc === gscToken) return;
    const meta = existing ?? document.createElement("meta");
    meta.id = elId;
    meta.name = "google-site-verification";
    meta.content = gscToken;
    if (!existing) document.head.appendChild(meta);
    applied.current.gsc = gscToken;
    (window.__abkAnalytics ??= {}).gsc = gscToken;
  }, [gscToken]);

  // ---------- Google Analytics 4 ----------
  useEffect(() => {
    const elId = "abk-ga-script";
    const valid = GA_ID_RE.test(gaId);
    if (!gaId || !valid || dev) {
      removeScript(elId);
      applied.current.ga = "";
      return;
    }
    if (applied.current.ga === gaId) return;

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    // Default page_view doesn't understand hash navigation → send manually.
    window.gtag("config", gaId, { send_page_view: false });
    upsertScript(elId, `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);

    const pageView = () => {
      window.gtag?.("event", "page_view", {
        page_path: `${window.location.pathname}${window.location.search}`,
        page_title: document.title,
      });
    };
    pageView();
    // Clean-path SPA navigation dispatches "popstate" (pushState fires no
    // event); legacy "#/…" links still trigger "hashchange".
    window.addEventListener("hashchange", pageView);
    window.addEventListener("popstate", pageView);
    applied.current.ga = gaId;
    (window.__abkAnalytics ??= {}).ga = gaId;
    return () => {
      window.removeEventListener("hashchange", pageView);
      window.removeEventListener("popstate", pageView);
    };
  }, [gaId, dev]);

  // ---------- Microsoft Clarity ----------
  useEffect(() => {
    const elId = "abk-clarity-script";
    const valid = CLARITY_ID_RE.test(clarityId);
    if (!clarityId || !valid || dev) {
      removeScript(elId);
      applied.current.clarity = "";
      return;
    }
    if (applied.current.clarity === clarityId) return;

    // Official clarity tag: queue + loader script (inserted before first <script>).
    if (!window.clarity) {
      const queue: unknown[] = [];
      const fn = ((...args: unknown[]) => {
        queue.push(args);
      }) as NonNullable<Window["clarity"]>;
      fn.q = queue;
      window.clarity = fn;
    }
    const s = document.createElement("script");
    s.id = elId;
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`;
    const first = document.getElementsByTagName("script")[0];
    if (first?.parentNode) first.parentNode.insertBefore(s, first);
    else document.head.appendChild(s);

    applied.current.clarity = clarityId;
    (window.__abkAnalytics ??= {}).clarity = clarityId;
  }, [clarityId, dev]);

  return null;
}
