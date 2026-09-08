"use client";

import { useEffect, useState } from "react";

/**
 * SEO head manager — dynamically sets document title, meta description,
 * canonical and JSON-LD structured data as the SPA route changes.
 */
export function useSeo(opts: {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}) {
  const { title, description, canonical, ogImage, ogType = "website", jsonLd, noindex } = opts;

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (!description) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [description]);

  useEffect(() => {
    if (!canonical) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
  }, [canonical]);

  useEffect(() => {
    if (!ogImage) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", "og:image");
      document.head.appendChild(meta);
    }
    meta.content = ogImage;
  }, [ogImage]);

  useEffect(() => {
    if (!title) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      document.head.appendChild(meta);
    }
    meta.content = title;
  }, [title]);

  useEffect(() => {
    if (!description) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [description]);

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[property="og:type"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("property", "og:type");
      document.head.appendChild(meta);
    }
    meta.content = ogType;
  }, [ogType]);

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = noindex ? "noindex, nofollow" : "index, follow";
  }, [noindex]);

  // JSON-LD injection
  useEffect(() => {
    if (!jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-dynamic-seo", "true");
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [jsonLd]);
}

export function JsonLdScript({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const [id] = useState(() => `jsonld-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [data, id]);
  return null;
}
