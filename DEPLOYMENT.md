# 🚀 Artistic by Khushi — Deployment Guide

## Aapke Netlify pe problem kyu aa rahi thi? (Root cause)

Website ke APIs (products, blog, admin login, inquiries) ek **SQLite database**
file padhte/likhte hain. Netlify ke serverless functions mein:

- ❌ Database file persist nahi hoti (har request pe naya ephemeral container)
- ❌ Image uploads bhi save nahi ho sakte (file-system read-only-ish)

Isliye header/footer (plain HTML) dikhta hai, lekin main content
("Something went sideways") aur admin login ("Something went wrong") fail
hote the — kyunki unhe database chahiye jo Netlify pe tha hi nahi.

## ✅ Solution: Netlify + Turso (FREE — aapka hi netlify.app URL chalega)

**Turso** = cloud SQLite (free plan kaafi hai). Maine poora code upgrade kar
diya hai — ab database aur image uploads dono Turso mein save hote hain,
aur Netlify pe sab kuch chalta hai:

- ✅ Products / blog / pages / settings — sab database se
- ✅ Admin login + panel
- ✅ Nayi inquiries save hoti hain
- ✅ Image uploads database mein (Netlify pe bhi permanently save)

---

## Step 1: Turso database banao (5 min, FREE)

1. **[app.turso.tech](https://app.turso.tech)** kholo → **Sign up with GitHub**
   (same GitHub account jisse Netlify pe deploy kiya tha)
2. Login ke baad: **Create database** → Name: `artistic-khushi` → **Create**
3. Database ban jaane ke baad us detail page pe jaao:
   - **Database URL** copy karo — dikhega kuch aisa:
     `libsql://artistic-khushi-<aapna-user>.turso.io`
   - **Generate token** / "Create auth token" button → token copy karo
     (`eyJ...` se shuru hota hai)

> Token ko safe rakho — ye database ka password hai.

## Step 2: Netlify mein environment variables daalo (2 min)

1. **Netlify dashboard** → apni site (`artisticbykhushi.netlify.app`) →
   **Site settings → Environment variables**
2. **Add a variable** (dono):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | `libsql://artistic-khushi-<user>.turso.io` |
   | `DATABASE_AUTH_TOKEN` | `eyJ...` (Step 1 ka token) |

3. Save karo.

## Step 3: Updated code push karo (5 min)

Ye wala updated code (jo abhi aapke paas hai) apne **GitHub repo** mein push
kar do — Netlify khud rebuild karega. Build ke dauraan:

- `netlify.toml` pehle **Turso database mein saari tables banata hai**
- Phir **poora content seed karta hai** — 22 products, 10 categories,
  6 blog posts, 5 pages, FAQs, homepage sections, settings, admin user
- (Ye sirf PEHLI baar hota hai — dobara deploy karne pe aapka naya data
  kabhi overwrite nahi hota)

Build complete hone pe:

1. `https://artisticbykhushi.netlify.app/` kholo — poori site live ✅
2. `#/admin` → **admin@artisticbykhushi.com / Khushi@2024** se login karo ✅
3. **Password turant change karna** (Security best practice)

## Step 4: Post-deploy checklist

1. Admin → **Site Settings → Site URL** = `https://artisticbykhushi.netlify.app`
   (SEO canonical tags + sitemap isi se banenge)
2. **Analytics & Tracking** card mein apne real IDs (GA / Search Console /
   Microsoft Clarity) daalo — Save karte hi live
3. Custom domain: Netlify → Domain settings → add karo (DNS CNAME point)

---

## Backup

Turso database ka backup:
- Turso dashboard → database → **Export / Dump** (SQL file download)
- Ya admin panel → Leads → CSV export

Kabhi bhi local `db/custom.db` se dobara seed karna ho:
`DATABASE_URL=... DATABASE_AUTH_TOKEN=... node scripts/netlify-init.mjs`

---

## Alternative: Railway / Render (Docker, ~$5-7/mo)

Agar Turso nahi lagana hai, Docker deploy bhi ready hai (`Dockerfile` +
`docker-entrypoint.sh` + `render.yaml`):

- Railway: repo → New Project → Volume mount path `/data` → done
- Render: repo → Web Service (blueprint `render.yaml` ready hai)
- Is path mein DB + uploads volume pe rehte hain (Turso ki zaroorat nahi)

## Technical notes (developer ke liye)

- `src/lib/db.ts`: **Prisma driver-adapter** (PrismaLibSQL factory) —
  ek hi client `file:` (local/Docker) aur `libsql://` (Turso) dono chalata hai
- Uploads: `MediaBlob` model — base64 chunks (512KB) DB mein; serve via
  `/api/media/*` (disk mirror first, DB fallback — Netlify pe DB hi source hai);
  `/uploads/*` → beforeFiles rewrite → serve route
- `scripts/netlify-init.mjs`: DDL from `scripts/schema.sql` (regenerate:
  `bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > scripts/schema.sql`),
  idempotent row-copy from `db/custom.db` + uploads → chunks; `INIT_FORCE=1`
  se local file-target testing bhi ho sakti hai
- Health check: `GET /api/public/bootstrap`
- Admin: `admin@artisticbykhushi.com` / `Khushi@2024`
