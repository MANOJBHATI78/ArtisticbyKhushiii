# 🚀 Artistic by Khushi — Deployment Guide

## Netlify pe problem kyu aayi thi? (Root cause)

Aapki website sirf ek "static site" nahi hai — isme 3 cheezein hain jo ek
**chalta hua server + database** chahti hain:

| Feature | Kaise kaam karta hai | Netlify |
|---|---|---|
| Products / Blog / Settings | **SQLite database** (`db/custom.db`) | ❌ Netlify ke functions mein file-system har request pe **mit jaata hai** — data save nahi hota |
| Admin login | Database + session cookie | ❌ Same wajah |
| Image uploads | `public/uploads` folder mein file likhna | ❌ Netlify pe likhi hui files **delete ho jaati hain** |

Header/footer dikhe kyunki wo simple HTML hai — main content + admin login
**API + database** se aata hai, jo Netlify pe chal hi nahi sakta.

> **Note:** Agar future mein Netlify hi chahiye, to database ko **Turso**
> (cloud SQLite) aur uploads ko blob storage mein migrate karna padega —
> wo alag project hai, tab kar lenge. Abhi ke liye niche wala tarika best hai.

---

## ✅ Recommended: Railway.app (easiest, ~$5/month)

Website ek **Docker container** ke roop mein chalti hai jisme database +
uploads ek **persistent volume** (`/data`) pe save rehte hain — kabhi delete
nahi honge, redeploy pe bhi safe.

### Steps (10 minutes)

1. **Code ko GitHub pe daalo**
   - Poora project folder download karo (ya already git repo hai to skip)
   - GitHub pe new **private repo** banao → saari files push karo
   - `db/custom.db` push hona **zaroori hai** (wahi aapki saari products,
     blogs, settings, admin login hai)

2. **Railway pe jao** → [railway.app](https://railway.app) → GitHub se sign in
   → **New Project → Deploy from GitHub repo** → apni repo select karo
   - Railway `Dockerfile` ko khud detect kar lega

3. **Volume attach karo (IMPORTANT — yahi data bachata hai)**
   - Service → **Settings / Volumes** → *New Volume*
   - **Mount path:** `/data`
   - Size: 1 GB (pehle ke liye kaafi)

4. **Deploy** — pehli baar build hoga (~3-5 min). Railway khud HTTPS URL
   dega (jaise `artistic-up-production.up.railway.app`)

5. **Login test karo**
   - `https://<aapna-url>/#/admin`
   - Email: `admin@artisticbykhushi.com` / Password: `Khushi@2024`
   - **Password turant change karna** (Settings ya support se bolo)

### Aapko kya milega live pe
- Saare 22 products, 10 categories, 6 blog posts, saari settings ✅
- Nayi inquiries database mein save + Google Sheets sync (agar webhook URL set ho) ✅
- Image uploads volume pe save — redeploy pe bhi safe ✅

---

## Alternatives

| Host | Kaise | Cost | Note |
|---|---|---|---|
| **Render.com** | GitHub repo → New → **Web Service** (repo me `render.yaml` ready hai) | $7/mo (disk ke saath) | Render free tier mein disk nahi milta |
| **Fly.io** | `fly launch` + volume 1GB | ~free tier se shuru | Thoda technical hai |
| **Zeabur** | Railway jaisa hi | plan varies | Deploy ka tareeka same hai (Docker) |

---

## Post-deploy checklist (ZAROORI)

1. **Admin → Site Settings → Site URL** field bharo:
   `https://aapka-domain.com` (sitemap, canonical tags, share links isi se
   banenge — SEO ke liye)
2. **Analytics & Tracking** card mein apne real IDs daalo:
   - Google Analytics: `G-XXXXXXXXXX`
   - Google Search Console token (HTML tag method)
   - Microsoft Clarity project ID
   - Save karte hi live ho jaayenge ✅
3. **Custom domain** connect karo (Railway/Render settings → Domains)
   → DNS: `CNAME` record host ke URL pe point karo
4. Google Search Console mein apna final domain **add + verify** karo

---

## Data backup (weekly habit)

- Railway service → **Volumes** → `/data` → download (DB + uploads)
- Ya admin panel → Leads → CSV export ( inquiries ka backup)

---

## Technical notes (developer ke liye)

- `DATABASE_URL=file:/data/custom.db` + `ABK_UPLOAD_DIR=/data/public-uploads`
  container mein set hain (Dockerfile ENV) — `.env` ki value inko override
  nahi karti kyunki process env hamesha jeet-ta hai.
- First boot pe `docker-entrypoint.sh` bundled `db/custom.db` ko `/data` mein
  copy karta hai — seed sirf ek baar, existing data kabhi overwrite nahi hota.
- `/uploads/*` URLs `next.config.ts` ke `beforeFiles` rewrite se
  `/api/media/*` serve route par jaate hain → volume ke files directly
  serve hote hain (immutable cache headers ke saath).
- Health check: `GET /api/public/bootstrap` (public + DB query — perfect liveness probe).
- Admin credentials: `admin@artisticbykhushi.com` / `Khushi@2024`
