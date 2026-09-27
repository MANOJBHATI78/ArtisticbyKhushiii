"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  AdminLandingPage,
  AdminUserRow,
  BlogCategory,
  DashboardStats,
  Faq,
  HomepageSection,
  Lead,
  LeadStats,
  MediaAsset,
  PageSchemaEntry,
  Paginated,
  PublicBlogPost,
  PublicCategory,
  PublicPage,
  PublicProduct,
  SiteSettings,
  Testimonial,
} from "@/lib/types";
import type { AdminUser } from "./admin-utils";

// ============================================================
// React Query hooks for every /api/admin/* endpoint.
// All keys live under the ["admin", …] namespace.
// ============================================================

export interface ProductListParams {
  page: number;
  pageSize: number;
  q: string;
  category: string;
  status: string;
}

export interface BlogListParams {
  page: number;
  pageSize: number;
  q: string;
  status: string;
}

export interface LeadListParams {
  page: number;
  pageSize: number;
  q: string;
  status: string;
}

// ---------------- auth ----------------

export function useAdminMe() {
  return useQuery<AdminUser>({
    queryKey: ["admin", "me"],
    // /api/admin/me returns { user: … } — unwrap so consumers get the
    // real { id, email, name, role } object (drives the sidebar card and
    // the OWNER-only "Users & Roles" navigation gate).
    queryFn: async () => {
      const res = await api.get<{ user: AdminUser }>("/api/admin/me");
      return res.user;
    },
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: true,
  });
}

// ---------------- dashboard ----------------

export function useAdminDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api.get<DashboardStats>("/api/admin/dashboard"),
    refetchOnWindowFocus: true,
  });
}

/** Lead analytics for the Dashboard charts (single fetch, invalidated on Dashboard mount). */
export function useLeadStats() {
  return useQuery<LeadStats>({
    queryKey: ["admin", "lead-stats"],
    queryFn: () => api.get<LeadStats>("/api/admin/leads/stats"),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

// ---------------- products ----------------

export function useAdminProducts(params: ProductListParams) {
  const sp = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) sp.set("q", params.q);
  if (params.category && params.category !== "all") sp.set("category", params.category);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  return useQuery<Paginated<PublicProduct>>({
    queryKey: ["admin", "products", params.page, params.pageSize, params.q, params.category, params.status],
    queryFn: () => api.get<Paginated<PublicProduct>>(`/api/admin/products?${sp.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useAdminProduct(id: string | null) {
  return useQuery<PublicProduct>({
    queryKey: ["admin", "product", id],
    queryFn: () => api.get<PublicProduct>(`/api/admin/products/${id}`),
    enabled: !!id,
    retry: false,
  });
}

// ---------------- categories ----------------

export interface AdminCategory extends PublicCategory {
  published: boolean;
}

export function useAdminCategories() {
  return useQuery<AdminCategory[]>({
    queryKey: ["admin", "categories"],
    queryFn: () => api.get<AdminCategory[]>("/api/admin/categories"),
  });
}

// ---------------- blogs ----------------

export function useAdminBlogs(params: BlogListParams) {
  const sp = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) sp.set("q", params.q);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  return useQuery<Paginated<PublicBlogPost>>({
    queryKey: ["admin", "blogs", params.page, params.pageSize, params.q, params.status],
    queryFn: () => api.get<Paginated<PublicBlogPost>>(`/api/admin/blogs?${sp.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useAdminBlog(id: string | null) {
  return useQuery<PublicBlogPost>({
    queryKey: ["admin", "blog", id],
    queryFn: () => api.get<PublicBlogPost>(`/api/admin/blogs/${id}`),
    enabled: !!id,
    retry: false,
  });
}

export function useBlogCategoriesList() {
  return useQuery<BlogCategory[]>({
    queryKey: ["admin", "blogCategories"],
    queryFn: () => api.get<BlogCategory[]>("/api/public/blog-categories"),
    staleTime: Infinity,
  });
}

// ---------------- pages ----------------

export interface AdminPage extends PublicPage {
  displayOrder?: number;
  updatedAt?: string;
}

export function useAdminPages() {
  return useQuery<AdminPage[]>({
    queryKey: ["admin", "pages"],
    queryFn: () => api.get<AdminPage[]>("/api/admin/pages"),
  });
}

// ---------------- faqs ----------------

export function useAdminFaqs(entityType = "") {
  return useQuery<Faq[]>({
    queryKey: ["admin", "faqs", entityType],
    queryFn: () =>
      api.get<Faq[]>(
        entityType ? `/api/admin/faqs?entityType=${entityType.toUpperCase()}` : "/api/admin/faqs",
      ),
  });
}

// ---------------- leads ----------------

export function useAdminLeads(params: LeadListParams, refetchIntervalMs = 0) {
  const sp = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  return useQuery<Paginated<Lead>>({
    queryKey: ["admin", "leads", params.page, params.pageSize, params.q, params.status],
    queryFn: () => api.get<Paginated<Lead>>(`/api/admin/leads?${sp.toString()}`),
    placeholderData: (prev) => prev,
    // LIVE mode (Leads table) — silently re-fetch so new enquiries appear
    // without the owner pressing refresh.
    ...(refetchIntervalMs > 0 ? { refetchInterval: refetchIntervalMs } : {}),
  });
}

// ---------------- media ----------------

export function useAdminMedia() {
  return useQuery<MediaAsset[]>({
    queryKey: ["admin", "media"],
    queryFn: () => api.get<MediaAsset[]>("/api/admin/media"),
  });
}

// ---------------- settings ----------------

export function useAdminSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["admin", "settings"],
    queryFn: () => api.get<SiteSettings>("/api/admin/settings"),
  });
}

// ---------------- homepage ----------------

export function useAdminHomepage() {
  return useQuery<HomepageSection[]>({
    queryKey: ["admin", "homepage"],
    queryFn: () => api.get<HomepageSection[]>("/api/admin/homepage"),
  });
}

// ---------------- landing pages ----------------

export function useAdminLandings(q = "") {
  return useQuery<AdminLandingPage[]>({
    queryKey: ["admin", "landing", q],
    queryFn: () => api.get<AdminLandingPage[]>(q ? `/api/admin/landing?q=${encodeURIComponent(q)}` : "/api/admin/landing"),
  });
}

// ---------------- testimonials ----------------

export function useAdminTestimonials(q = "") {
  return useQuery<Testimonial[]>({
    queryKey: ["admin", "testimonials", q],
    queryFn: () => api.get<Testimonial[]>(q ? `/api/admin/testimonials?q=${encodeURIComponent(q)}` : "/api/admin/testimonials"),
  });
}

// ---------------- users & roles (OWNER only endpoint) ----------------

export function useAdminUsers() {
  return useQuery<AdminUserRow[]>({
    queryKey: ["admin", "users"],
    queryFn: async () => (await api.get<{ users: AdminUserRow[] }>("/api/admin/users")).users,
    retry: false, // 403 for non-owners is expected — no point retrying
  });
}

// ---------------- per-page JSON-LD schemas ----------------

export function useAdminPageSchemas() {
  return useQuery<PageSchemaEntry[]>({
    queryKey: ["admin", "schemas"],
    queryFn: async () => (await api.get<{ schemas: PageSchemaEntry[] }>("/api/admin/page-schemas")).schemas,
  });
}

/** Lightweight product list for pickers (landing page product selection etc.). */
export function useAdminProductsLite() {
  return useQuery<PublicProduct[]>({
    queryKey: ["admin", "products-lite"],
    queryFn: async () => {
      const page1 = await api.get<Paginated<PublicProduct>>("/api/admin/products?pageSize=100");
      if (page1.totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: page1.totalPages - 1 }, (_, i) =>
            api.get<Paginated<PublicProduct>>(`/api/admin/products?page=${i + 2}&pageSize=100`),
          ),
        );
        return [...page1.items, ...rest.flatMap((p) => p.items)];
      }
      return page1.items;
    },
    staleTime: 60_000,
  });
}

// ============================================================
// Shared mutation helper — invalidates admin caches + optionally
// the public site caches so the website reflects changes at once.
// ============================================================

export function useAdminMutation<TData, TVars>(
  fn: (vars: TVars) => Promise<TData>,
  invalidates: string[][],
  extraInvalidates: string[][] = [],
) {
  const qc = useQueryClient();
  return useMutation<TData, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of invalidates) void qc.invalidateQueries({ queryKey: key });
      for (const key of extraInvalidates) void qc.invalidateQueries({ queryKey: key });
    },
  });
}

/** Invalidate everything the public site shows (after content/settings edits). */
export const PUBLIC_CACHE_KEYS: string[][] = [
  ["settings"],
  ["bootstrap"],
  ["home"],
  ["categories"],
  ["products"],
  ["blogs"],
  ["faqs"],
  ["blogCategories"],
];
