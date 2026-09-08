# Task 2-a — Backend APIs (full-stack-developer)

Task: Implement every API route under `src/app/api/**` for the Artistic by Khushi platform (public site data, lead capture, sitemap/robots, admin auth + full CMS CRUD) and test them all.

## What was built

### Shared server code
- `src/lib/serializers.ts` — ONE shared serializer module: `toPublicProduct`, `toPublicCategory`, `toPublicBlogPost`, `toPublicPage`, `toFaq`, `toLead`, `toMediaAsset`, `pickFeaturedImage` logic, `pagination()`, `paginated()`, plus generic helpers: `readJsonBody`, `str`, `strOrNull`, `bool`, `int`, `has`, `toJsonArrayString`, `visiblePostWhere()` (PUBLISHED or SCHEDULED-with-past-publishAt), `POST_ORDER`, `estimateReadingTime`, `clientIp`.
- `src/app/api/admin/_guard.ts` — `requireAdmin(request)` → `{user, error}` guard (401 envelope on failure).
- `src/app/api/admin/_lib.ts` — shared admin payload parsers: `parseImages`, `parseProductFields`, `parseCategoryFields`, `parseBlogFields` (+`applyBlogRules`: publishedAt=now on publish, readingTime auto-estimate), `parsePageFields`, `parseFaqFields`, `unique{Product,Category,Blog,Page}Slug`, `toDateOrNull`, `BLOG_STATUSES`.

### Public endpoints (all verified)
- GET `/api/public/bootstrap` → SiteSettings
- GET `/api/public/home` → HomeData (6 sections mapped by sectionKey, null if missing; featuredCategories/Products, latestBlogs 3, GENERAL faqs)
- GET `/api/public/categories` → PublicCategory[] with productCount
- GET `/api/public/categories/[slug]` → { category, products, faqs, relatedCategories(≤4), relatedBlogs(≤3, name-matching first) } — 404 if missing/unpublished
- GET `/api/public/products` → Paginated<PublicProduct> (page/pageSize 12 max 48, category slug, q search, featured=1) — exact envelope `{ok:true,data:{items,total,page,pageSize,totalPages}}` verified
- GET `/api/public/products/[slug]` → { product, faqs, relatedProducts (relatedProductIds JSON first, same-category fill, max 4), relatedBlogs, category|null }
- GET `/api/public/blogs` → Paginated<PublicBlogPost> (q, tag CSV, cat slug; PUBLISHED or SCHEDULED≤now; publishedAt desc)
- GET `/api/public/blogs/[slug]` → { post, faqs, relatedProducts (≤3 via relatedProductSlugs), relatedBlogs (same category first) } — future-scheduled 404s
- GET `/api/public/blog-categories` → with postCount
- GET `/api/public/pages/[slug]` → PublicPage (published only)
- GET `/api/public/faqs` → GENERAL published
- GET `/api/public/search?q=` → { products≤8, categories≤8, blogs≤8, query }; empty q → empty arrays
- POST `/api/public/leads` — honeypot `website` (fake success, no save), rate limit 5/10min/IP (429), validation (name 2–80, mobile /^\+?\d{10,15}$/ after stripping spaces/dashes, city 2–80, message ≤1000, preferredContact ≤40), Lead row (NEW), Google Sheets webhook forward (5s timeout, silent), returns { leadId, sheetSynced }
- GET `/api/sitemap` → application/xml, 51 URLs (8 static + 10 cat + 22 prod + 6 blog + 5 page), lastmod from updatedAt, siteUrl base if set
- GET `/api/robots` → text/plain (allow all, Disallow /api/ and /admin, Sitemap link)

### Admin endpoints (all verified)
- POST `/api/admin/login` (rate limit 10/15min, scrypt verify, Set-Cookie httpOnly via sessionCookie), POST `/api/admin/logout` (destroys session + clears cookie), GET `/api/admin/me`
- GET `/api/admin/dashboard` → DashboardStats (all counts + recentLeads 5 / recentProducts 5 / recentBlogs 5)
- Products: GET list (q/category/status filters, default pageSize 50), POST create (slug auto, sanitizeHtml longDescription, images→ProductImage rows, relatedProductIds JSON-array validation), `[id]` GET/PUT (partial update; images replace: delete missing / upsert by id / create new) / DELETE (cascade)
- Categories: GET (with productCount), POST, `[id]` GET/PUT/DELETE — delete with products → 409 "…pass force=true", force=true cascades
- Blogs: GET list (q/status: all|published|draft|scheduled), POST (status enum, publishAt ""→null, PUBLISHED→publishedAt=now, readingTime auto), `[id]` GET/PUT/DELETE
- Pages: GET/POST, `[id]` GET/PUT/DELETE (content sanitized)
- FAQs: GET (entityType/entityId filters), POST (question/answer required, entityType default GENERAL), `[id]` PUT/DELETE
- Leads: GET (q/status, Paginated<Lead>, createdAt desc), `[id]` PUT {status (validated vs LEAD_STATUSES), notes} / DELETE
- Media: GET newest-first, POST multipart (type/mime whitelist jpg/jpeg/png/webp/gif/avif, ≤8MB, sharp resize 1600 + webp q82, `upload-<ts>-<rand6>.webp` in /public/uploads, MediaAsset row, returns {media,url}), `[id]` PUT meta / DELETE (file removed from disk, path-traversal-safe)
- Settings: GET, PUT partial (SiteSetting upsert per key, returns merged settings)
- Homepage: GET all sections, PUT `[sectionKey]` (upsert, sanitizeHtml body, itemsJson must parse as array, only 6 known keys)

## Test results (curl, dev server :3000)
- All public endpoints 200 with correct shapes; 404s for missing/unpublished product/page/category; future-scheduled blog 404 + hidden from list; scheduled-past visible.
- Envelope check: `{ok:true,data:{items,total,page,pageSize,totalPages}}` exact ✓
- Leads: missing name→400, honeypot→fake ok with no row, valid→row created (id returned) ✓
- Login wrong password→401; without cookie all admin routes→401; cookie jar flow works; logout clears session (me→401) ✓
- Product CRUD full cycle: create w/ 2 images + script stripped from longDescription, GET, PUT rename + image reorder (old deleted, kept id updated, new created), DELETE + cascade (0 orphan images) ✓
- Category create/delete ✓; delete with 2 products → HTTP 409 with message ✓
- Blog CRUD + invalid status 400 + readingTime auto (450 words → 3 min) ✓
- Page/FAQ/Lead/Media/Settings/Homepage CRUD all ✓ (media: PNG→webp 300B served as image/webp; bad type rejected)
- `bun run lint` → 0 errors 0 warnings. dev.log: no API runtime errors (only concurrent frontend-agent page.tsx/site-app.tsx module errors, unrelated to APIs).

## Notes for next agents (3-a / 3-b)
- All responses use the envelope `{ok:true,data}` / `{ok:false,error}` (unwrap via `src/lib/api-client.ts`).
- Admin routes require cookie `abk_admin_session` (login returns user {id,email,name,role}).
- Product/category/blog/page POST+PUT accept full or partial bodies; images arrays replace wholly when provided; `relatedProductIds`/`relatedProductSlugs` are JSON-array strings.
- Admin category list items include an extra `published` field; admin page items include `displayOrder` (beyond Public* types).
- Test data left in DB: 1 lead ("Test User", status CONTACTED) — safe to delete via admin UI.
