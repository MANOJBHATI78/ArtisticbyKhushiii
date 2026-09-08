# Task 3-a — Public Website Frontend (Artistic by Khushi)

## Scope
Owns `src/components/site/**` and `src/components/views/**`. The full public customer-facing SPA (hash-routed, rendered inside `/`).

## State on arrival
The site component + view files were already fully drafted from an earlier interrupted run. I audited every file against the task spec, verified them live, and confirmed all contract points — no gaps found, so no code changes were required. Focused this run on verification + environment recovery.

## Files (final state)
- `src/components/site/site-app.tsx` — Providers wrapper, useSettings→store, hash-route view switch (all 16 routes), UTM capture from page query → sessionStorage, skip-link, sticky-footer shell, single global InquiryModal + WhatsAppFloat + Toaster.
- `src/components/site/` — site-header (announcement bar w/ session dismissal, desktop nav w/ active gold underline, search + Enquire CTA, mobile Sheet w/ 44px targets), site-footer (4-col espresso bg, top-6 categories, socials, legal links, discreet Admin link, safe-area padding), whatsapp-float (#25D366 pulse), inquiry-modal + shared inquiry-form (validation, honeypot `website`, UTM/sourcePage/referrer payload, product-context chip, POST /api/public/leads → #/thank-you, toast on error), img (lazy + graceful gradient fallback — critical while images generate), product-card / category-card / blog-card, breadcrumbs (+BreadcrumbList JSON-LD), section-heading, faq-accordion (+FAQPage JSON-LD), empty-state/error-state, skeletons, container, fade-in, seo-helpers.
- `src/components/views/` — home (10 data-driven sections, Organization+LocalBusiness+WebSite JSON-LD), products (category chips + debounced search + pagination, URL-synced), product (gallery w/ thumbnails, tabs Details/Specs/Customization, related products/blogs, product FAQs, final CTA, Product JSON-LD), categories, category (intro → products → customization callout → FAQs → related → bottomContent, CollectionPage+FAQPage JSON-LD), blog (featured hero + tag/category chips + pagination), blog-post (DOMParser TOC w/ sticky sidebar, Article JSON-LD, share), about, services, page-view (generic), contact (info cards + shared form, LocalBusiness JSON-LD), faq (client filter + FAQPage JSON-LD), search (autofocus, 3 result sections, noindex), thank-you (ref chip, noindex), not-found (link grid, noindex).

## Verification (agent-browser session task3a)
- Home renders all 10 sections with live API data; 4 JSON-LD schemas present (FAQPage, Organization, LocalBusiness, WebSite).
- #/products chip click → filters + URL `?category=resin-nameplates`; pagination controls present.
- #/product/personalized-resin-nameplate → gallery (2 thumbs), tabs, related, FAQs; "Enquire About This Product" opens modal with product chip; submitted test lead → landed on #/thank-you; DB row verified (product/productUrl/category/sourcePage/preferredContact correct); test leads deleted after check.
- #/categories, #/category/resin-nameplates, #/blog (featured story), #/blog/resin-nameplate-design-ideas (TOC + share + related), #/about, #/contact (info cards + form; second submit test → #/thank-you), #/faq, #/search?q=nameplate (3+1+2 results), #/page/privacy-policy, bogus hash → 404 view (noindex) — all OK.
- Mobile 375px: hamburger Sheet verified (nav + Call/WhatsApp + Enquire, 44px targets); announcement dismiss works; per-view document titles update.
- ESLint on site+views: 0 problems. Browser console: 0 errors. dev.log: only expected image 404s.

## Environment notes (IMPORTANT for later agents)
- The dev server had been OOM-killed (kernel log: next-server 2GB RSS killed). Stale agent-browser chrome daemons from earlier sessions were the memory hog — I killed them.
- Bash-spawned background processes are reaped when the tool call ends; `setsid nohup ... &` from the main shell does NOT survive. Use the **double-detach pattern**: `bash -c 'setsid nohup CMD >/dev/null 2>&1 </dev/null &'` (inner bash exits immediately → child reparents to init → survives).
- Dev server was restarted this way and is healthy; image generation (`scripts/gen-images.sh`, ~35 images, skips existing) also restarted the same way and is progressing — images 404 until they land; the `Img` component falls back gracefully.
