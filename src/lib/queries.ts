"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  HomeData,
  PublicCategory,
  PublicBlogPost,
  PublicLandingPage,
  PublicPage,
  PublicProduct,
  SearchResults,
  SiteSettings,
  Faq,
  Paginated,
  BlogCategory,
  Testimonial,
} from "@/lib/types";

// Keys for cache invalidation
export const qk = {
  settings: ["settings"] as const,
  home: ["home"] as const,
  categories: ["categories"] as const,
  category: (slug: string) => ["category", slug] as const,
  products: (page: number, pageSize: number, category: string, q: string) =>
    ["products", page, pageSize, category, q] as const,
  product: (slug: string) => ["product", slug] as const,
  blogs: (page: number, pageSize: number, q: string, tag: string, cat: string) =>
    ["blogs", page, pageSize, q, tag, cat] as const,
  blog: (slug: string) => ["blog", slug] as const,
  blogCategories: ["blogCategories"] as const,
  page: (slug: string) => ["page", slug] as const,
  landing: (slug: string) => ["landing", slug] as const,
  faqs: ["faqs"] as const,
  testimonials: ["testimonials"] as const,
  search: (q: string) => ["search", q] as const,
};

export function useSettings() {
  return useQuery<SiteSettings>({
    queryKey: qk.settings,
    queryFn: () => api.get<SiteSettings>("/api/public/bootstrap"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useHome() {
  return useQuery<HomeData>({
    queryKey: qk.home,
    queryFn: () => api.get<HomeData>("/api/public/home"),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCategories() {
  return useQuery<PublicCategory[]>({
    queryKey: qk.categories,
    queryFn: () => api.get<PublicCategory[]>("/api/public/categories"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategory(slug: string) {
  return useQuery<{ category: PublicCategory; products: PublicProduct[]; faqs: Faq[]; relatedCategories: PublicCategory[]; relatedBlogs: PublicBlogPost[] }>({
    queryKey: qk.category(slug),
    queryFn: () => api.get(`/api/public/categories/${slug}`),
    enabled: !!slug,
  });
}

export function useProducts(page = 1, pageSize = 12, category = "", q = "") {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  return useQuery<Paginated<PublicProduct>>({
    queryKey: qk.products(page, pageSize, category, q),
    queryFn: () => api.get(`/api/public/products?${params.toString()}`),
  });
}

export function useProduct(slug: string) {
  return useQuery<{ product: PublicProduct; faqs: Faq[]; relatedProducts: PublicProduct[]; relatedBlogs: PublicBlogPost[]; category: PublicCategory | null }>({
    queryKey: qk.product(slug),
    queryFn: () => api.get(`/api/public/products/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}

/** Full catalogue in one cached fetch — powers wishlist & recently-viewed by slug. */
export function useAllProducts() {
  return useQuery<Paginated<PublicProduct>>({
    queryKey: ["products", "all"] as const,
    // The API caps pageSize at 48 — walk pages until we have the whole catalogue
    // (single page for the current 23-piece catalogue; future-proof if it grows).
    queryFn: async () => {
      const first = await api.get<Paginated<PublicProduct>>("/api/public/products?page=1&pageSize=48");
      const items = [...first.items];
      for (let page = 2; page <= Math.min(first.totalPages, 5); page++) {
        const next = await api.get<Paginated<PublicProduct>>(`/api/public/products?page=${page}&pageSize=48`);
        items.push(...next.items);
      }
      return { ...first, items, page: 1 };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useBlogs(page = 1, pageSize = 9, q = "", tag = "", cat = "") {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set("q", q);
  if (tag) params.set("tag", tag);
  if (cat) params.set("cat", cat);
  return useQuery<Paginated<PublicBlogPost>>({
    queryKey: qk.blogs(page, pageSize, q, tag, cat),
    queryFn: () => api.get(`/api/public/blogs?${params.toString()}`),
  });
}

export function useBlog(slug: string) {
  return useQuery<{ post: PublicBlogPost; faqs: Faq[]; relatedProducts: PublicProduct[]; relatedBlogs: PublicBlogPost[] }>({
    queryKey: qk.blog(slug),
    queryFn: () => api.get(`/api/public/blogs/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}

export function useBlogCategories() {
  return useQuery<BlogCategory[]>({
    queryKey: qk.blogCategories,
    queryFn: () => api.get<BlogCategory[]>("/api/public/blog-categories"),
  });
}

export function usePage(slug: string) {
  return useQuery<PublicPage>({
    queryKey: qk.page(slug),
    queryFn: () => api.get(`/api/public/pages/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}

export function useLandingPage(slug: string) {
  return useQuery<PublicLandingPage>({
    queryKey: qk.landing(slug),
    queryFn: () => api.get<PublicLandingPage>(`/api/public/landing/${slug}`),
    enabled: !!slug,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });
}

export function useFaqs() {
  return useQuery<Faq[]>({
    queryKey: qk.faqs,
    queryFn: () => api.get<Faq[]>("/api/public/faqs"),
    staleTime: 1000 * 60 * 5,
  });
}

/** Published customer testimonials for the homepage social-proof section. */
export function useTestimonials(limit = 6) {
  return useQuery<Testimonial[]>({
    queryKey: [...qk.testimonials, limit],
    queryFn: () => api.get<Testimonial[]>(`/api/public/testimonials?limit=${limit}`),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSearch(q: string, enabled = true) {
  return useQuery<SearchResults>({
    queryKey: qk.search(q),
    queryFn: () => api.get(`/api/public/search?q=${encodeURIComponent(q)}`),
    enabled: enabled && q.trim().length > 1,
  });
}
