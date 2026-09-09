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

---
Task ID: 1-b
Agent: lead (Z.ai Code main)
Task: Brand updates from user — logo integration, Surat location, new phone/WhatsApp, worldwide shipping

Work Log:
- Analyzed uploaded logo (VLM): "Artistic by Khushi", deep chocolate brown bg (#3E2515), warm cream text (#F3E5D0), stylized K with leaves, script+sans typography
- Copied logo → public/images/logo.png (1020×1020 square, solid brown bg)
- Updated globals.css palette to match logo: primary = deep chocolate brown, cream background, gold accent, terracotta secondary
- Added logoUrl to SiteSettings type + defaults (phone +91 83201 12554, whatsapp 918320112554, city Surat/Gujarat, serviceAreas incl. worldwide shipping)
- Updated seed: Surat everywhere, international shipping FAQ, demo leads (3), logo in media assets; re-ran seed
- Fixed image gen script: API requires dimensions multiple of 32 (1440x720 → 1344x768), added FAIL detection; generation running in background

Stage Summary:
- Brand identity locked: Artistic by Khushi, brown/cream/gold theme, logo at /images/logo.png, favicon set in layout
- Contact: +91 83201 12554 (phone & WhatsApp), Surat + pan-India + worldwide shipping
- Frontend agents (3-a public, 3-b admin) launching next — must use settings.logoUrl in header/footer

---
Task ID: 3-a
Agent: full-stack-developer (Public Website Frontend)
Task: Build + verify the complete public customer-facing SPA (16 hash routes, shared site components, inquiry/lead flow, SEO)

Work Log:
- Read worklog.md + all shared libs (types, router, store, queries, seo, api-client); found the site/views code fully drafted from an interrupted prior run and audited every file against the 3-a spec instead of rewriting
- Audited src/components/site/** (site-app shell w/ Providers, UTM capture, view switch; header w/ announcement bar + mobile Sheet; espresso footer w/ collections/legal/Admin link; WhatsAppFloat; InquiryModal + shared InquiryForm w/ honeypot + validation; Img lazy wrapper; product/category/blog cards; breadcrumbs+JSON-LD; faq-accordion; skeletons; empty/error states) — all contract points present
- Audited src/components/views/** (home 10 sections w/ Org+LocalBusiness+WebSite JSON-LD; products w/ chips+search+pagination; product w/ gallery/tabs/related/FAQs+Product JSON-LD; category w/ CollectionPage+FAQPage; blog + blog-post w/ DOMParser TOC + Article JSON-LD; about/services/page/contact/faq/search/thank-you/404) — all 15 views call useSeo; no gaps → zero code changes needed
- Environment recovery: dev server had been OOM-killed (stale agent-browser chromes were hogging RAM) — killed stale daemons, restarted dev server + image generation script with a double-detach spawn pattern (bash -c 'setsid nohup CMD &' — survives tool-call reaping)
- Verified live with agent-browser (own session): home (10 sections, 4 JSON-LD types), products chip → ?category=resin-nameplates filter, product page gallery + Enquire modal w/ product chip → lead POST → #/thank-you (DB row: product/productUrl/category/sourcePage/preferredContact correct; test leads deleted), contact form submit → #/thank-you, categories, category, blog featured story, blog post TOC/share/related, about, faq, search q=nameplate (3/1/2 results), page/privacy-policy, bogus hash → 404 (noindex), mobile 375px hamburger Sheet, announcement dismissal, per-view document titles
- ESLint "src/components/site/**" "src/components/views/**" → 0 problems; browser console 0 errors; dev.log clean (only progressive image 404s); screenshots saved to /tmp/3a-*.png

Stage Summary:
- 16 files in src/components/site/** + 15 views in src/components/views/** complete and live-verified; lead funnel works end-to-end (modal + contact page → DB → thank-you); SEO per-view meta/canonical/JSON-LD + noindex on search/thank-you/404; a11y (skip link, 44px targets, aria) and mobile-first responsive confirmed; dev server + background image generation running via double-detach; open item: ~33 product/category/brand images still generating into /public/images (Img component degrades gracefully until they land)

---
Task ID: 3-b
Agent: full-stack-developer (Admin Panel Frontend)
Task: Build + verify the complete Admin Panel ("Studio Console") SPA view for #/admin — 10 modules, auth gate, owner-friendly UX

Work Log:
- Read worklog.md + shared libs (types, api-client, router, queries, providers, layout.tsx, backend routes for contract details: pagination caps, serializers)
- Found the admin panel fully drafted from an interrupted prior run; audited all 14 files in src/components/admin/** against the 3-b spec line-by-line instead of rewriting
- Fixed 7 concrete gaps: (1) removed duplicate <Toaster/> mounted by admin-app (layout already has one → double toasts); (2) active module now persists in sessionStorage (abk_admin_module) so reloads land on the same module; (3) ProductForm init waits for the FAQs query (race: FAQs tab could load empty); (4) BlogForm same race fix + SCHEDULED publishAt prefill (API omits publishAt); (5) Categories 409 force-delete reworked to hold the category in state (old code re-found it by name-substring match on the error message); (6) Leads CSV export now loops pages of 100 (backend caps pageSize — pageSize=1000 silently truncated at 100), spec filename artistic-by-khushi-leads.csv, CheckCheck/CloudOff sheet-sync icons; (7) polish: Dashboard emoji button → ImageIcon, Settings social fields got lucide icons (Field component gained icon prop; Pinterest uses Pin — lucide 0.525 dropped brand icon)
- Verified live with agent-browser (own session, task3b-*): login wrong-password alert + correct login → dashboard real stats (22 products 21/1, 10 categories, 6 blogs, 3 leads 2 NEW); Products search "nameplate" → 4 rows, published toggle persisted via API + restored, edit form prefilled (name/SKU/slug/category/shortDescription), shortDescription edit → save → "Product saved" toast + API persisted + restored, created "QA Test Piece" (auto-slug qa-test-piece, Resin Coasters, /images/cat-coasters.jpg) → listed → deleted via confirm → API total 0; Categories move-up swap persisted (Resin Nameplates 1 ↔ Spiritual 2, restored), delete-with-products → 409 dialog "This category has 3 products…" + "Delete anyway (force)" (cancelled); Blogs status PUBLISHED→DRAFT→PUBLISHED verified via API (publishedAt preserved), quick draft post created → deleted; Leads status NEW→FOLLOW_UP→NEW persisted (curl cookie jar), detail Sheet with wa.me/6581234567 + Call + Copy + delete, CSV export downloaded (BOM, headers, 3 rows); Media uploaded public/images/logo.png → upload-*.webp in grid + API, alt edit on blur saved, delete removed DB row + disk file; Settings announcements change → Save → curl /api/public/bootstrap reflects new value (proves settings+bootstrap cache invalidation) → restored original; Homepage hero heading tweak → save → curl /api/public/home reflects → reverted; reload → module restored from sessionStorage; logout → browser /api/admin/me 401 → login again works
- Quality gates: bunx eslint "src/components/admin/**" → 0 problems; bunx tsc → 0 errors under src/components/admin; browser console + dev.log (last 300 lines) → no errors; all mutated seed data restored (product/category/blog/lead/media/settings/homepage test changes reverted, test artifacts deleted)

Stage Summary:
- 14 files in src/components/admin/** complete: admin-app (auth gate + module routing + splash), AdminLogin, AdminLayout (collapsible sidebar, mobile Sheet + bottom tab bar ≥44px, leads NEW badge, quick-add, global search, refresh), Dashboard (4 stat cards, recent inquiries, quick actions, recently updated), ProductsManager (table/cards, filters, optimistic toggles, 6-tab ProductForm with images/specs/SEO/FAQs-diff/publish + related products), CategoriesManager (toggles, inline order, reorder, 409 force-delete, 2-tab dialog form), BlogsManager (list + 4-tab BlogForm with internal-link RTE, schedule, SEO, relations/FAQs), PagesManager, FaqsManager (scope tabs + entity resolution), LeadsManager (stats, filters, inline status Select, notes popover, detail Sheet w/ WhatsApp/call, paginated CSV export), MediaLibrary (dropzone multi-upload w/ progress, grid, alt/caption save-on-blur, copy URL), HomepageManager (6 collapsible section cards, itemsJson editor, per-section save + ["home"] invalidation), SettingsManager (5 cards, sticky save bar, ["settings"]+["bootstrap"] invalidation, wa.me preview), shared libs (react-query hooks, auth hook, utils, shared atoms, RTE, media picker); known minor limitation: blog publishAt not returned by API so scheduled date prefills as now+24h on reload; admin panel ready for owner use at #/admin

---
Task ID: 4 (Integration & Verification)
Agent: lead (Z.ai Code main)
Task: Cross-agent integration, fixes, end-to-end verification, handover

Work Log:
- Fixed backend serializer: toPublicBlogPost now returns publishAt (SCHEDULED posts prefill correctly in admin BlogForm); added publishAt to PublicBlogPost type
- Full project lint: 0 errors, 0 warnings
- Restored data left by agent testing: Executive Office Nameplate back to published (22/22 published), deleted test lead "Test Kumar"
- Confirmed stale PinterestLogo dev.log errors were from agent's intermediate state (current file imports Pin correctly; settings module renders + saves fine)
- All 43 brand/product/blog images generated to /public/images (script fixed for API's 32-multiple dimension rule); DB image reference audit: 0 missing
- End-to-end agent-browser verification (own session):
  * Home: all 10 sections + logo + announcement bar; VLM quality review 9/10, 0 broken images (24 checked)
  * Catalog: category chips filter (counts correct), product page gallery + tabs + breadcrumbs
  * Lead funnel: Enquire modal → validation → submit → #/thank-you → lead in DB with product/category/source context
  * Admin: login → dashboard live stats (22 products, 10 categories, 6 blogs, leads badge) → publish toggle persisted both ways → settings module renders all fields → save + cache invalidation verified by agents
  * Mobile 375px: hamburger menu with phone +91 83201 12554, WhatsApp CTA
  * Sticky footer: wrapper min-h-screen flex-col + footer mt-auto + safe-area inset — verified in DOM
  * SEO: /api/sitemap 51 URLs with lastmod; /api/robots correct; JSON-LD per view (Organization/LocalBusiness/WebSite/Product/Article/Breadcrumb/FAQPage)
- Attempted to create the 15-min webDevReview cron job (8 format variations) — gateway cron create action consistently rejects with "job is required" although list/get actions work; TOOL-SIDE ISSUE, retry in next phase

Stage Summary:
- PROJECT COMPLETE AND VERIFIED: dynamic catalogue (10 categories/22 products), blog CMS (6 posts), 5 pages, FAQs, lead system (DB + optional Google Sheets forwarding + honeypot + rate limit), WhatsApp integration (+91 83201 12554, editable), search, sitemap/robots/schema, full admin panel, brand-locked design (chocolate/cream/gold, logo integrated)
- Admin credentials: admin@artisticbykhushi.com / Khushi@2024
- Open risks: cron gateway defect (job creation fails); siteUrl setting empty (set after domain connect); Google Sheets webhook URL empty (owner can add in Settings); hero image slight crop on right edge (minor)
- Next-phase recommendations: image alt-text polish pass, blog tag pages, lead analytics chart, GA4 integration once IDs exist, Google Apps Script setup guide for Sheets sync

---
Task ID: 5
Agent: lead (Z.ai Code main)
Task: Dynamic analytics integrations — Google Analytics 4, Google Search Console, Microsoft Clarity — configurable from admin panel

Work Log:
- Added `microsoftClarityProjectId` to SiteSettings type + DEFAULT_SETTINGS (PUT /api/admin/settings auto-accepts via SETTING_KEYS; getSettings merges defaults — no route changes needed)
- Created src/components/site/analytics.tsx `SiteAnalytics` component: GA4 gtag.js injection with `send_page_view:false` + manual page_view events on every hashchange (GA's history listener doesn't cover hash routers); GSC `google-site-verification` meta tag with smart parser (accepts full meta tag / `google-site-verification=token` / bare token); Microsoft Clarity official queue+loader snippet; all three skip on localhost dev (clean console) and remove themselves when the setting is cleared; `window.__abkAnalytics` debug handle
- Mounted SiteAnalytics in site-app.tsx SiteShell (public site only — never renders under #/admin)
- SettingsManager.tsx: new dedicated "Analytics & Tracking" card (GA / GSC / Clarity / Sheets webhook) with green "Live on site"/"Not set" status pills in the Field counter slot, inline format validation (GA_ID_RE G-XXXXXX, CLARITY_ID_RE 6-16 alnum) shown as destructive error text, setup-help links row (analytics.google.com / search.google.com/search-console / clarity.microsoft.com); old SEO & Integrations card split into "SEO Defaults" + this card
- Verified live via agent-browser: invalid GA shows error hint; saved G-QATEST123 + full meta tag + QA123CLRTY → DB persisted; via gateway host (21.0.1.156:81 — non-localhost so scripts load): gtag.js + clarity tag + verification meta all injected, `window.gtag` function present, dataLayer received page_view `/#/` then `/#/products` on hash navigation; cleared all 3 fields → saved → DB empty → fresh public load has NO scripts/meta and clean console; eslint + tsc clean for all touched files; dev.log clean
- QA note: agent-browser `fill` with empty string doesn't trigger React onChange — use real keystrokes (click + Ctrl+A + Backspace) when clearing controlled inputs

Stage Summary:
- Owner can now connect GA4, Search Console & Clarity with zero code changes: Admin → Site Settings → Analytics & Tracking → paste IDs → Save → live instantly (scripts verified end-to-end incl. SPA hash pageviews & removal on clear)
- Settings flow: SiteSettings(microsoftClarityProjectId) → bootstrap API → SiteAnalytics injector; googleSheetsWebhookUrl unchanged (lead sync)
- Open: owner needs real IDs (currently empty = all tools off); GSC verification relies on JS-rendered meta (Googlebot renders JS; DNS method is fallback)

---
Task ID: 6
Agent: lead (Z.ai Code main) — triggered by webDevReview cron + user Netlify deployment issue
Task: Diagnose Netlify failure + make project production-deployable (Docker + volume)

Work Log:
- User deployed to Netlify: header/footer rendered but main content showed "Something went sideways" and admin login "Something went wrong" → ROOT CAUSE: all API routes depend on Prisma SQLite + disk file uploads; (1) .env had sandbox-absolute DATABASE_URL=file:/home/z/my-project/db/custom.db (doesn't exist on Netlify), (2) Netlify functions have ephemeral filesystem — SQLite writes/uploads can never persist there. Static shell (header/footer) renders without APIs; every data fetch 500s/404s → error states.
- Made paths portable: .env now DATABASE_URL=file:../db/custom.db (relative to prisma/schema.prisma; dev server auto-reloaded, verified 200 + login OK)
- New src/lib/uploads.ts: UPLOAD_DIR (env ABK_UPLOAD_DIR, default public/uploads) + safeUploadPathFromUrl; admin media routes now use it (upload POST + [id] DELETE)
- New GET /api/media/[...path]/route.ts: serves files from UPLOAD_DIR with correct MIME, immutable cache headers, traversal guards (404 verified for ../ attacks)
- next.config.ts: beforeFiles rewrite /uploads/:path* → /api/media/:path* so DB-stored URLs work identically in dev (public dir) and prod (Docker volume outside public/)
- src/lib/db.ts: prisma log reduced to error/warn in production (query logs were dev-only noisy)
- Deployment assets: Dockerfile (oven/bun:1, bun install --frozen-lockfile, prisma generate, next build, runs `next start` with PORT env; ENV DATABASE_URL=file:/data/custom.db + ABK_UPLOAD_DIR=/data/public-uploads; VOLUME /data), docker-entrypoint.sh (first boot copies bundled db/custom.db → /data — ships all 22 products/blogs/settings/admin; subsequent boots never overwrite), .dockerignore, render.yaml (Render blueprint with disk + health check), DEPLOYMENT.md (Hinglish owner guide: why Netlify failed, Railway steps with /data volume, Render/Fly/Zeabur alternatives, post-deploy checklist: siteUrl setting, GA/GSC/Clarity IDs, custom domain, backups)
- Verified in dev: /uploads/qa-test.txt + /api/media/qa-test.txt both 200 with API immutable cache header (proves rewrite routes through API), real webp serves as image/webp, traversal blocked 404, admin login 200 (cookie jar), home renders 13 headings/24 imgs with clean console, eslint + tsc 0 problems on all changed files
- Deferred from interrupted round 6: admin Dashboard lead analytics charts (recharts) + public-site GA event tracking/styling polish — top priorities for next round

Stage Summary:
- Project is now production-deployable as a Docker container with persistent /data volume (DB + uploads survive redeploys); Netlify is architecturally unsuitable for this SQLite+FS app — owner guided to Railway/Render via DEPLOYMENT.md; all path handling env-driven and dev-verified
- Open risks: Docker image itself not buildable in sandbox (no docker daemon) — Dockerfile follows oven/bun + next start best practices but needs one real build on the host; Netlify-native path (Turso migration) remains a future option if owner insists on Netlify
- Next-phase priorities: (1) owner deploys to Railway and we verify live, (2) dashboard lead charts, (3) GA event tracking + styling polish round
