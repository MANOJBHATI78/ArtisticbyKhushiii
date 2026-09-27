# 🚀 Artistic by Khushi — Deployment Guide (v7.2)

> **Is version mein kya naya hai:** Site ab **khud ko heal** karti hai.
> Database missing/empty ho to code apne aap tables + poora content
> (22 products, 6 blogs, admin user — sab) bana deta hai. Plus ek **/api/health**
> diagnostic page — live site pe problem ho to exact reason wahi dikhega.

## 🔴 Build fail ho raha hai? — DATABASE NOT CONFIGURED

Agar Netlify build log mein ye message dikhe:

```
❌ DEPLOY FAILED — DATABASE NOT CONFIGURED
❌ Netlify pe database (Turso) ke env variables set nahi hue hain.
```

to iska matlab: **latest code Netlify pe pahunch chuka hai** (ye message naye
code ka hissa hai — purana code ye message deta hi nahi tha). Bas ab **Step 1
+ Step 2** karo — 7 minute ka kaam, phir site live.

Ye build **jaan-boojh kar rok** di gayi hai: env vars ke bina deploy hota to
site live hoti lekin "Something went sideways" wahi purana problem lauta hota.
Env vars set karte hi ye message kabhi nahi aayega.

Fix ke liye **dono** chahiye: (1) latest code ✅ (already pushed), (2) Turso
database ⬇️

---

## Step 1: Turso database banao (5 min, FREE)

1. **[app.turso.tech](https://app.turso.tech)** kholo → **Sign up with GitHub**
   (same GitHub account jisse Netlify deploy kiya tha)
2. **Create database** → Name: `artistic-khushi` → **Create**
3. Database detail page se:
   - **Database URL** copy karo → `libsql://artistic-khushi-<user>.turso.io`
   - **Generate token** → `eyJ...` copy karo (ye database ka password hai)

## Step 2: Netlify environment variables (2 min)

1. **Netlify dashboard** → site (`artisticbykhushi.netlify.app`) →
   **Site settings → Environment variables**
2. Add karo (dono):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | `libsql://artistic-khushi-<user>.turso.io` |
   | `DATABASE_AUTH_TOKEN` | `eyJ...` (Step 1 ka token) |

3. Save.

> ⚠️ **Agar aapke Netlify pe "Neon" extension installed hai** (build log mein
> `Installing extensions - neon` dikhta hai) — use **remove/disable** kar do:
> Site settings → Extensions → Neon → Remove. Ye Postgres database banata hai
> jo hum use nahi karte; kabhi-kabhi ye apna `DATABASE_URL` khud set kar deta
> hai jo Turso URL ke saath conflict karega. Sirf Turso chahiye.

## Step 3: LATEST CODE push karo (sabse important!)

Jo code aapne pehle push kiya tha usme database-fix **nahi tha**. Latest code
le kar apne GitHub repo mein **replace/push** karo — ye files specially zaroori
hain:

- `netlify.toml` (repo ke root mein honi chahiye)
- `src/lib/db.ts` + `src/lib/db-snapshot.json` (self-healing database)
- `src/app/api/health/route.ts` (diagnostics)
- `scripts/netlify-init.mjs` + `scripts/schema.sql`
- `prisma/schema.prisma` + `package.json` + `bun.lock`/lockfile

> Poora project folder download karke repo mein replace karna **sabse safe**
> hai (`.next/`, `node_modules/`, `db/` chhod sakte ho).

Push ke baad Netlify khud rebuild karega. Build ke dauraan:
- Tables Turso mein banti hain + poora content seed hota hai (sirf pehli baar —
  aapka naya data kabhi overwrite nahi hota)
- Agar env variables set nahi hain to **build hi fail ho jata hai** clear
  message ke saath (aisa isliye taaki broken site live na ho)

## Step 4: Verify (1 min)

1. `https://artisticbykhushi.netlify.app/api/health` kholo —
   `"ok": true` + `"mode": "turso"` dikhna chahiye
2. Home page kholo — poora content dikhega
3. `/#/admin` → `admin@artisticbykhushi.com` / `Khushi@2024` → **password
   turant change karo**

> Agar kuch bhi fail ho: `/api/health` ka output screenshot karo — usme exact
> reason + fix likha hota hai (e.g. "HTTP status 401" = token galat,
> "404" = URL galat, "getaddrinfo" = URL typo).

---

## Naya: Site ab "fail" nahi hoti — fallback mode

Agar kisi bhi host pe Turso env vars set na hon AUR disk writable ho, to site
**bundled snapshot se khud ko seed kar leti hai** aur normal chalti hai.
Admin panel mein is case mein yellow warning banner dikhta hai ("Temporary
database mode") — kyunki serverless pe changes restart pe lost ho sakte hain.
Permanent data ke liye Step 1-2 (Turso) zaroori hain.

## Post-deploy checklist

1. Admin → **Site Settings → Site URL** = `https://artisticbykhushi.netlify.app`
   (SEO canonical + sitemap isi se bante hain)
2. **Analytics & Tracking** card: GA / Search Console / Microsoft Clarity IDs
   paste karo — Save karte hi live
3. Custom domain: Netlify → Domain settings
4. Turso backup: Turso dashboard → database → Export/Dump

## Alternative: Railway / Render (Docker, ~$5-7/mo)

Turso nahi lagana hai? Docker path ready hai (`Dockerfile`,
`docker-entrypoint.sh`, `render.yaml`):
- Railway: repo → New Project → Volume mount `/data`
- Render: repo → Web Service (blueprint ready)
- DB + uploads volume pe — Turso ki zaroorat nahi

## Technical notes (developer ke liye)

- `src/lib/db.ts`: Prisma driver-adapter (PrismaLibSQL) + **AutoInit adapter**
  — `connect()` pe `ensureDatabaseReady()` chalta hai: table check → DDL
  (IF NOT EXISTS) → snapshot seed (INSERT OR IGNORE, idempotent).
  Modes: `turso` (libsql://…), `file` (absolute-path resolve: cwd/prisma/root
  candidates), `tmp-fallback` (read-only FS → os.tmpdir + snapshot).
- `src/lib/db-snapshot.json`: generated by `bun run db:snapshot` —
  AdminUser/Category/Product/ProductImage/BlogCategory/BlogPost/Page/Faq/
  MediaAsset/SiteSetting/HomepageSection (sessions/leads/media-blobs excluded).
- Error surfacing: saare 33 API routes ab 500 pe `describeDbError(e)` detail
  dete hain; frontend `ErrorState` + admin login isse "Server said:" block
  mein dikhate hain; `/api/health` full diagnostics (mode, counts, fix hint,
  APP_VERSION "7.2.0").
- Media: `MediaBlob` base64 chunks in DB; `/uploads/*` → beforeFiles rewrite →
  `/api/media/*` (disk first, DB fallback).
- `scripts/netlify-init.mjs`: build-time seed (runtime self-heal se double-safe).
  Schema regenerate: `bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > scripts/schema.sql`
- Admin: `admin@artisticbykhushi.com` / `Khushi@2024`
