# Artistic by Khushi — Worklog

Project: Complete dynamic website + admin panel + product catalogue + blog CMS + SEO + lead management.
Stack: Next.js 16 App Router (single `/` page + hash-based SPA), TypeScript, Tailwind 4 + shadcn/ui, Prisma + SQLite, TanStack Query, Zustand.

## Architecture decisions

- **Only `/` page route exists** (sandbox constraint). The whole public site AND admin panel are client-side views inside `src/app/page.tsx`, driven by a hash router (`#/`, `#/products`, `#/product/[slug]`, `#/category/[slug]`, `#/blog`, `#/blog/[slug]`, `#/about`, `#/contact`, `#/faq`, `#/page/[slug]`, `#/search`, `#/thank-you`, `404`, `#/admin`).
- All backend logic lives in `src/app/api/**` route handlers (fetch-based, no server actions).
- SEO handled client-side: `src/lib/seo.ts` sets document title/meta/canonical/JSON-LD per view. Sitemap + robots served by API routes.
- Admin auth: scrypt password hashing (Node crypto, no deps) + session tokens in httpOnly cookie `abk_admin_session`.
- Leads stored in DB (`Lead` model) + optional Google Sheets webhook forwarding (setting `googleSheetsWebhookUrl`) server-side only.
- Images generated into `/public/images/` (brand set done by lead agent). Uploads go to `/public/uploads/`.

## DB schema (prisma/schema.prisma — pushed)

Models: AdminUser, AdminSession, Category (self-referencing parent, SEO fields, introContent/bottomContent), Product (+ ProductImage gallery table, all catalogue fields, SEO fields), BlogCategory, BlogPost (status DRAFT/PUBLISHED/SCHEDULED, publishAt, SEO fields), Page, Faq (polymorphic entityType GENERAL|PRODUCT|CATEGORY|BLOG|PAGE + entityId), Lead (status NEW/CONTACTED/FOLLOW_UP/CONVERTED/NOT_INTERESTED/CLOSED, utm fields), MediaAsset, SiteSetting (key/value), HomepageSection (sectionKey hero|brand_intro|why_choose|custom_orders|memory_preservation|final_cta, itemsJson for lists).

## Shared libs (already written)

- `src/lib/types.ts` — ALL API contract types (PublicProduct, PublicCategory, PublicBlogPost, PublicPage, Faq, Lead, SiteSettings, HomeData, DashboardStats, Paginated<T>, ApiResponse<T> = {ok:true,data}|{ok:false,error}, DEFAULT_SETTINGS). READ THIS FILE.
- `src/lib/api-client.ts` — client fetch wrapper `api.get/post/put/delete/upload` that unwraps the envelope.
- `src/lib/router.ts` — hash router: `useHashRoute()` returns {path, segments, query, hash}; `navigate("/product/x")`.
- `src/lib/store.ts` — Zustand: settings + inquiry modal state (`openInquiry(ctx)`, `whatsappLink(settings, product?)`).
- `src/lib/queries.ts` — TanStack Query hooks: useSettings, useHome, useCategories, useCategory, useProducts, useProduct, useBlogs, useBlog, useBlogCategories, usePage, useFaqs, useSearch.
- `src/lib/seo.ts` — `useSeo({title, description, canonical, ogImage, jsonLd, noindex})` + `JsonLdScript`.
- `src/lib/auth.ts` — hashPassword/verifyPassword (scrypt), createSession/destroySession, getSessionUser(request), sessionCookie/clearSessionCookie helpers.
- `src/lib/server-utils.ts` — ok()/fail() JSON helpers, rateLimit(key, limit, windowMs), sanitizeHtml(html) allowlist filter, getSettings(), slugify(), uniqueSlug().
- Brand design: warm cream/terracotta/gold palette in globals.css (`--primary` terracotta, `--gold`, `--font-display` Playfair, `--font-body` Jost, `.prose-content` styles for CMS HTML, `.custom-scroll`).

## API CONTRACT (envelope: { ok: true, data } | { ok: false, error })

### Public
- GET `/api/public/bootstrap` → SiteSettings
- GET `/api/public/home` → HomeData { hero, brandIntro, featuredCategories, featuredProducts, whyChoose, customOrders, memoryPreservation, latestBlogs, faqs, finalCta } (sections are HomepageSection|null)
- GET `/api/public/categories` → PublicCategory[] (published, ordered by displayOrder; includes productCount)
- GET `/api/public/categories/[slug]` → { category, products: PublicProduct[], faqs: Faq[], relatedCategories: PublicCategory[], relatedBlogs: PublicBlogPost[] }
- GET `/api/public/products?page=1&pageSize=12&category=slug&q=search&featured=1` → Paginated<PublicProduct>
- GET `/api/public/products/[slug]` → { product, faqs, relatedProducts, relatedBlogs, category } (published only)
- GET `/api/public/blogs?page=1&pageSize=9&q=&tag=&cat=slug` → Paginated<PublicBlogPost> (status PUBLISHED, or SCHEDULED with publishAt<=now)
- GET `/api/public/blogs/[slug]` → { post, faqs, relatedProducts, relatedBlogs }
- GET `/api/public/blog-categories` → BlogCategory[]
- GET `/api/public/pages/[slug]` → PublicPage
- GET `/api/public/faqs` → Faq[] (entityType GENERAL, published)
- GET `/api/public/search?q=xyz` → SearchResults { products, categories, blogs, query }
- POST `/api/public/leads` body { name, mobile, city, product?, productUrl?, category?, message?, preferredContact?, sourcePage?, utmSource?, utmMedium?, utmCampaign?, referrer?, honeypot? } → { leadId, sheetSynced } (validates server-side, honeypot field `website` must be empty, rate-limited 5/10min per IP)
- GET `/api/sitemap` → XML sitemap (all published products/categories/blogs/pages)
- GET `/api/robots` → robots.txt text

### Admin (all require session cookie; 401 JSON otherwise)
- POST `/api/admin/login` { email, password } → { user: {id,email,name,role} } + sets cookie
- POST `/api/admin/logout` → { success: true }
- GET `/api/admin/me` → { user } or 401
- GET `/api/admin/dashboard` → DashboardStats
- GET `/api/admin/products?page&pageSize&q&category&status` → Paginated<Product (full row + category name + images)>
- POST `/api/admin/products` body = full product fields (name required; slug auto if empty; images: [{url,alt,caption,isFeatured,displayOrder}]; highlights/customizationOptions are \n-separated strings) → { product }
- GET `/api/admin/products/[id]` → full product
- PUT `/api/admin/products/[id]` body same as POST → { product }
- DELETE `/api/admin/products/[id]` → { success: true }
- Same CRUD pattern for `/api/admin/categories`, `/api/admin/blogs` (+ fields: content HTML, status, publishAt ISO or "", blogCategoryId, relatedProductSlugs), `/api/admin/pages`, `/api/admin/faqs` (question, answer, entityType, entityId, displayOrder, published)
- GET `/api/admin/leads?page&pageSize&q&status` → Paginated<Lead>; PUT `/api/admin/leads/[id]` { status?, notes? } → { lead }; DELETE → { success }
- GET `/api/admin/media` → MediaAsset[]; POST `/api/admin/media` (FormData: file, alt?, caption?) → { media: MediaAsset, url } (saves to /public/uploads); PUT `/api/admin/media/[id]` { alt, caption, title }; DELETE `/api/admin/media/[id]` → also removes file
- GET `/api/admin/settings` → SiteSettings; PUT `/api/admin/settings` body = partial SiteSettings → { settings }
- GET `/api/admin/homepage` → HomepageSection[]; PUT `/api/admin/homepage/[sectionKey]` body = section fields → { section }

## Seed data (done)

22 products (with galleries+FAQs), 10 categories, 6 blog posts (full HTML), 5 pages (about/services/privacy/terms/disclaimer), 8 general FAQs, homepage sections, settings, admin user **admin@artisticbykhushi.com / Khushi@2024**. Run re-seed with `bun scripts/seed.ts`.

---
Task ID: 1
Agent: lead (Z.ai Code main)
Task: Foundation — schema, libs, seed, design system

Work Log:
- Read full spec from upload/Pasted Content_1788880949878.txt (2182 lines)
- Wrote prisma schema (17 models), pushed to SQLite
- Wrote src/lib/{types,auth,server-utils,router,store,api-client,queries,seo}.ts
- Wrote globals.css brand palette (cream/terracotta/gold, Playfair+Jost fonts in layout.tsx)
- Wrote page.tsx SPA shell (dynamic import SiteApp/AdminApp by hash)
- Seeded DB via scripts/seed.ts; added db:seed + gen:images scripts
- Image batch generation running in background (scripts/gen-images.sh → /public/images/, log: imagegen.log)

Stage Summary:
- Foundation complete; next: Task 2-a backend APIs, then 3-a public frontend + 3-b admin frontend

---
Task ID: 2-a
Agent: full-stack-developer (Backend APIs)
Task: Implement + test all API routes (public site data, leads, sitemap/robots, admin auth & CMS CRUD)

Work Log:
- Read worklog.md, types.ts, server-utils.ts, auth.ts, prisma/schema.prisma; verified seeded slugs & sharp-under-Bun
- Wrote ONE shared serializer module src/lib/serializers.ts (toPublicProduct/Category/BlogPost/Page, toFaq/toLead/toMediaAsset, pagination/paginated, body-coercion helpers, visiblePostWhere, estimateReadingTime)
- Added src/app/api/admin/_guard.ts (requireAdmin) + src/app/api/admin/_lib.ts (shared payload parsers & unique-slug helpers per entity)
- Public: bootstrap, home (6 sections→null-safe, featured cats/prods, latestBlogs, GENERAL faqs), categories (+[slug] with products/faqs/relatedCategories≤4/relatedBlogs≤3), products list (Paginated, page/pageSize/category/q/featured) + [slug] (faqs, relatedProducts via relatedProductIds + same-category fill ≤4, relatedBlogs, category), blogs list (q/tag/cat; PUBLISHED or SCHEDULED≤now) + [slug] (404 future-scheduled), blog-categories (+postCount), pages/[slug], faqs, search (top 8 each), leads POST (honeypot fake-success, 5/10min rate limit, validation, Google Sheets webhook forward w/ 5s timeout), sitemap XML (51 URLs, lastmod, siteUrl-aware), robots.txt
- Admin: login (rate-limited 10/15min, scrypt, httpOnly Set-Cookie), logout, me, dashboard (DashboardStats + 5 recents each), products GET/POST/[id] GET/PUT/DELETE (image replace: delete-missing/upsert-by-id/create-new; sanitizeHtml; relatedProductIds JSON validated), categories CRUD (delete w/ products → 409 unless force=true), blogs CRUD (status enum, publishAt ""→null, PUBLISHED→publishedAt=now, readingTime auto-estimate), pages CRUD, faqs CRUD (entityType/entityId filters), leads GET + [id] PUT/DELETE (LEAD_STATUSES validation), media GET/POST (sharp: max 1600px, webp q82, ≤8MB, whitelist types, /public/uploads) + [id] PUT/DELETE (disk cleanup, traversal-safe), settings GET/PUT (SiteSetting upsert), homepage GET + [sectionKey] PUT (upsert, itemsJson array-validated, 6 known keys)
- Tested every endpoint with curl (cookie jar for admin): all CRUD cycles, 401 guards, 404s, 409 category guard, honeypot, validation errors, media upload (PNG→webp served as image/webp), scheduled-post visibility, Paginated envelope exactness; fixed unused eslint-disable directives; lint clean (0 problems); dev.log shows no API runtime errors

Stage Summary:
- 37 route files created under src/app/api/** (+ serializers.ts, _guard.ts, _lib.ts); every endpoint from the contract verified OK against the running dev server (public 15, admin 22 handlers); all data mutated during tests restored/cleaned except 1 test lead left for admin-UI testing; ready for 3-a (public frontend) and 3-b (admin frontend) to consume the API
