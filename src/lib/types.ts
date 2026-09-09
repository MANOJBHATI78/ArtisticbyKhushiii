// ============================================================
// Artistic by Khushi — Shared API contract types
// These types define the shape of every API response used by
// the public SPA and the Admin Panel. Both the backend routes
// and frontend components must conform to these types.
// ============================================================

export interface SiteSettings {
  brandName: string;
  tagline: string;
  logoUrl: string;
  logoText: string;
  phone: string;
  whatsappNumber: string;
  whatsappMessage: string;
  email: string;
  address: string;
  city: string;
  state: string;
  serviceAreas: string;
  instagramUrl: string;
  facebookUrl: string;
  pinterestUrl: string;
  youtubeUrl: string;
  footerAbout: string;
  copyrightText: string;
  defaultSeoTitle: string;
  defaultMetaDescription: string;
  defaultOgImage: string;
  googleAnalyticsId: string;
  googleSearchConsoleToken: string;
  microsoftClarityProjectId: string;
  googleSheetsWebhookUrl: string;
  headerCtaText: string;
  headerCtaUrl: string;
  announcements: string;
  siteUrl: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
  isFeatured: boolean;
  displayOrder: number;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  subcategory: string;
  shortDescription: string;
  longDescription: string;
  highlights: string;
  customizationOptions: string;
  size: string;
  material: string;
  colour: string;
  occasion: string;
  careInstructions: string;
  tags: string;
  featured: boolean;
  published: boolean;
  displayOrder: number;
  relatedProductIds: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  gallery: ProductImage[];
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  imageUrl: string;
  imageAlt: string;
  introContent: string;
  bottomContent: string;
  featured: boolean;
  displayOrder: number;
  parentId: string | null;
  productCount: number;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  entityType: string;
  entityId: string | null;
  displayOrder: number;
  published: boolean;
}

export interface PublicBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverAlt: string;
  author: string;
  readingTime: number;
  tags: string;
  featured: boolean;
  status: string;
  publishAt: string | null;
  publishedAt: string | null;
  blogCategoryName: string | null;
  blogCategorySlug: string | null;
  relatedProductSlugs: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  postCount: number;
}

export interface PublicPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  seoTitle: string;
  metaDescription: string;
}

export interface HomepageSection {
  sectionKey: string;
  heading: string;
  subheading: string;
  body: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  ctaText2: string;
  ctaUrl2: string;
  itemsJson: string;
  visible: boolean;
  displayOrder: number;
}

export interface HomeData {
  hero: HomepageSection | null;
  brandIntro: HomepageSection | null;
  featuredCategories: PublicCategory[];
  featuredProducts: PublicProduct[];
  whyChoose: HomepageSection | null;
  customOrders: HomepageSection | null;
  memoryPreservation: HomepageSection | null;
  latestBlogs: PublicBlogPost[];
  faqs: Faq[];
  finalCta: HomepageSection | null;
}

export interface SearchResults {
  products: PublicProduct[];
  categories: PublicCategory[];
  blogs: PublicBlogPost[];
  query: string;
}

export interface Lead {
  id: string;
  name: string;
  mobile: string;
  city: string;
  product: string;
  productUrl: string;
  category: string;
  message: string;
  preferredContact: string;
  sourcePage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  referrer: string;
  status: string;
  notes: string;
  sheetSynced: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  featuredProducts: number;
  totalCategories: number;
  publishedBlogs: number;
  draftBlogs: number;
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  totalFaqs: number;
  totalPages: number;
  recentLeads: Lead[];
  recentProducts: { id: string; name: string; slug: string; published: boolean; updatedAt: string }[];
  recentBlogs: { id: string; title: string; slug: string; status: string; updatedAt: string }[];
}

// ---------------- lead analytics ----------------

export interface LeadDailyPoint {
  /** "YYYY-MM-DD" (UTC) */
  date: string;
  /** leads created that day (all statuses) */
  count: number;
  /** leads created that day that are currently CONVERTED */
  converted: number;
}

export interface LeadStatusCount {
  status: string;
  count: number;
}

export interface LeadProductCount {
  name: string;
  count: number;
}

export interface LeadStatsTotals {
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  /** CONVERTED / total leads, percentage (0-100, 1 decimal) */
  conversionRate: number;
}

export interface LeadStats {
  /** last 14 days, oldest first, zero-filled (every day present) */
  leadsPerDay: LeadDailyPoint[];
  /** all 6 LEAD_STATUSES with counts (zeros included) */
  statusBreakdown: LeadStatusCount[];
  /** top 5 products by lead count (leads with a product set) */
  topProducts: LeadProductCount[];
  totals: LeadStatsTotals;
}

export interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  alt: string;
  caption: string;
  title: string;
  size: number;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiErr {
  ok: false;
  error: string;
}

export type ApiResponse<T> = ApiOk<T> | ApiErr;

// ---------------- helpers ----------------

export const LEAD_STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "NOT_INTERESTED", "CLOSED"] as const;

export const DEFAULT_SETTINGS: SiteSettings = {
  brandName: "Artistic by Khushi",
  tagline: "Handcrafted Resin Art & Personalized Gifting",
  logoUrl: "/images/logo.png",
  logoText: "Artistic by Khushi",
  phone: "+91 83201 12554",
  whatsappNumber: "918320112554",
  whatsappMessage: "Hello! I'm interested in your handcrafted resin art. Please share more details.",
  email: "hello@artisticbykhushi.com",
  address: "",
  city: "Surat",
  state: "Gujarat",
  serviceAreas: "Surat — pan-India delivery — worldwide international shipping",
  instagramUrl: "https://instagram.com/artisticbykhushi",
  facebookUrl: "",
  pinterestUrl: "",
  youtubeUrl: "",
  footerAbout: "Artistic by Khushi is a handcrafted resin art studio creating personalized nameplates, home décor, memory keepsakes and custom gifts — made with love, one piece at a time.",
  copyrightText: "Artistic by Khushi. All rights reserved.",
  defaultSeoTitle: "Artistic by Khushi | Handcrafted Personalized Resin Art & Gifts",
  defaultMetaDescription: "Discover handcrafted resin nameplates, wall art, trays, jewellery and memory preservation keepsakes by Artistic by Khushi. Personalized designs made with love. Enquire on WhatsApp.",
  defaultOgImage: "/images/og-default.jpg",
  googleAnalyticsId: "",
  googleSearchConsoleToken: "",
  microsoftClarityProjectId: "",
  googleSheetsWebhookUrl: "",
  headerCtaText: "Enquire Now",
  headerCtaUrl: "#/contact",
  announcements: "✨ Now accepting custom orders for the festive season — book yours early!",
  siteUrl: "",
};

// Parses a JSON list from a string; returns [] on failure.
export function parseJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Splits a comma / newline separated string into trimmed tokens.
export function splitList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
