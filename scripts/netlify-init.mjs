/**
 * Netlify / Turso bootstrap — one-shot, idempotent.
 *
 * Runs during the Netlify build (see netlify.toml) BEFORE `next build`:
 *  1. Creates all tables on the target database (DATABASE_URL — Turso or file)
 *     if they don't exist yet, using scripts/schema.sql.
 *  2. Copies every row from the bundled seed database (db/custom.db —
 *     22 products, 10 categories, 6 blogs, pages, FAQs, settings, admin user)
 *     into the target, ONLY IF the target AdminUser table is empty.
 *  3. Moves any /uploads files present in the repo into MediaBlob DB chunks.
 *
 * Safe to run on every deploy: a database that already has content is never
 * overwritten.
 *
 * Plain Node ESM (no bun/tsx needed): node scripts/netlify-init.mjs
 */
import { createClient } from "@libsql/client";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DEST_URL = process.env.DATABASE_URL;
const DEST_TOKEN =
  process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "";
const SOURCE_URL =
  process.env.SOURCE_DATABASE_URL || `file:${path.join(ROOT, "db/custom.db")}`;

// True when running inside a Netlify build (CI adds these automatically).
const ON_NETLIFY = Boolean(process.env.NETLIFY || process.env.CONTEXT);

if (!DEST_URL) {
  if (ON_NETLIFY) {
    console.error(`
❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌
❌  DEPLOY FAILED — DATABASE NOT CONFIGURED
❌
❌  Netlify pe database (Turso) ke env variables set nahi hue hain.
❌  Iske bina site live hone ke baad bhi "Something went sideways"
❌  error hi dikhega — isliye build ko yahin rok diya gaya hai.
❌
❌  FIX (2 minute):
❌  1. Netlify dashboard → Site settings → Environment variables
❌  2. Add these TWO variables (Turso app.turso.tech se):
❌       DATABASE_URL        = libsql://<your-db>.turso.io
❌       DATABASE_AUTH_TOKEN = eyJ... (Turso token)
❌  3. Save → Deploys → Trigger deploy → Clear cache and deploy site
❌
❌  Full guide: DEPLOYMENT.md (Step 1 & Step 2)
❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌
`);
    process.exit(1);
  }
  console.error("[netlify-init] DATABASE_URL is not set — nothing to do.");
  process.exit(0); // non-fatal: plain file: dev/Docker flows don't need this
}
if (!DEST_URL.startsWith("libsql://") && !DEST_URL.startsWith("https://")) {
  if (ON_NETLIFY) {
    console.error(`
❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌
❌  DEPLOY FAILED — WRONG DATABASE_URL
❌
❌  DATABASE_URL ki value "${DEST_URL}" hai, lekin Netlify pe
❌  Turso CLOUD database chahiye (file: database Netlify pe kabhi
❌  nahi chalegi — serverless filesystem permanent nahi hota).
❌
❌  FIX: Netlify → Site settings → Environment variables →
❌  DATABASE_URL ko badal kar Turso ka URL daalo:
❌       libsql://<your-db>.turso.io
❌  (DEPLOYMENT.md Step 1 & Step 2)
❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌
`);
    process.exit(1);
  }
  // Local file target — dev/Docker data already lives there. (INIT_FORCE=1
  // overrides this so the copier can be tested against a fresh local file.)
  if (!process.env.INIT_FORCE) {
    console.log(`[netlify-init] DATABASE_URL is a local file (${DEST_URL}) — skipping.`);
    process.exit(0);
  }
}
if (ON_NETLIFY && !DEST_TOKEN) {
  console.error(`
❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌
❌  DEPLOY FAILED — DATABASE_AUTH_TOKEN MISSING
❌
❌  DATABASE_URL sahi hai (libsql://) lekin auth token nahi mila.
❌  Turso har request pe token maangta hai.
❌
❌  FIX: Netlify → Site settings → Environment variables →
❌  Add:  DATABASE_AUTH_TOKEN = eyJ... (Turso "Generate token")
❌  (DEPLOYMENT.md Step 1 & Step 2)
❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌
`);
  process.exit(1);
}

const dest = createClient(
  DEST_TOKEN ? { url: DEST_URL, authToken: DEST_TOKEN } : { url: DEST_URL },
);
const source = createClient({ url: SOURCE_URL });

async function tableExists(name) {
  const r = await dest.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}';`,
  );
  return r.rows.length > 0;
}

async function ensureSchema() {
  // Always run column migrations first — existing databases created by older
  // code need new columns/tables (never touches existing data).
  const migrations = [
    ["HomepageSection", { mobileImageUrl: "TEXT NOT NULL DEFAULT ''" }],
    ["Category", { mobileImageUrl: "TEXT NOT NULL DEFAULT ''" }],
  ];
  for (const [table, cols] of migrations) {
    if (!(await tableExists(table))) continue;
    const info = await dest.execute(`PRAGMA table_info("${table}");`);
    const existing = new Set(info.rows.map((r) => String(r.name)).filter(Boolean));
    for (const [col, ddl] of Object.entries(cols)) {
      if (!existing.has(col)) {
        await dest.execute(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${ddl};`);
        console.log(`[netlify-init] Migrated ${table}: added ${col}.`);
      }
    }
  }

  const hasAdmin = await tableExists("AdminUser");
  if (hasAdmin) {
    // New tables must still be created on existing databases (IF NOT EXISTS).
    const ddlAll = await readFile(path.join(ROOT, "scripts/schema.sql"), "utf8");
    const createStatements = ddlAll
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => /^CREATE (TABLE|UNIQUE INDEX)/i.test(s))
      .map((s) => s.replace(/^CREATE TABLE/i, "CREATE TABLE IF NOT EXISTS").replace(/^CREATE UNIQUE INDEX/i, "CREATE UNIQUE INDEX IF NOT EXISTS"));
    for (const stmt of createStatements) {
      if (stmt) await dest.execute(stmt + ";").catch(() => {});
    }
    console.log("[netlify-init] Tables already exist — new tables ensured, skipping full DDL.");
    return;
  }
  const ddl = await readFile(path.join(ROOT, "scripts/schema.sql"), "utf8");
  // Strip comment lines; libsql executeMultiple handles the rest.
  const sql = ddl
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
  await dest.executeMultiple(sql);
  console.log("[netlify-init] Schema created on target database.");
}

// Naive but effective: pull every row as strings and INSERT with quoted values.
// SQLite values from libsql come back as string|number|null.
function sqlValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function tableColumns(client, table) {
  const r = await client.execute(`PRAGMA table_info("${table}");`);
  return r.rows.map((row) => String(row.name)).filter(Boolean);
}

async function copyTable(table) {
  // Column list discovered from the SOURCE database (schema-agnostic).
  const columns = await tableColumns(source, table);
  if (columns.length === 0) {
    console.log(`[netlify-init]   ${table}: not found in source, skipped`);
    return 0;
  }
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const rows = (await source.execute(`SELECT ${colList} FROM "${table}";`)).rows;
  if (rows.length === 0) {
    console.log(`[netlify-init]   ${table}: 0 rows`);
    return 0;
  }
  for (const row of rows) {
    const vals = columns.map((c) => sqlValue(row[c]));
    await dest.execute(`INSERT OR IGNORE INTO "${table}" (${colList}) VALUES (${vals.join(", ")});`);
  }
  console.log(`[netlify-init]   ${table}: ${rows.length} rows`);
  return rows.length;
}

async function copySeedData() {
  const count = await dest.execute("SELECT COUNT(*) AS n FROM \"AdminUser\";");
  const existing = Number(count.rows[0]?.n ?? 0);
  if (existing > 0) {
    console.log(
      `[netlify-init] Target already has ${existing} admin users — data present, NOT overwriting.`,
    );
    return false;
  }

  console.log("[netlify-init] Seeding content into target database…");
  const order = [
    "AdminUser",
    "Category",
    "Product",
    "ProductImage",
    "BlogCategory",
    "BlogPost",
    "Page",
    "Faq",
    "Lead",
    "MediaAsset",
    "SiteSetting",
    "HomepageSection",
    "MediaBlob",
  ];
  for (const table of order) {
    try {
      await copyTable(table);
    } catch (e) {
      console.warn(`[netlify-init]   ${table}: skipped (${e.message})`);
    }
  }
  return true;
}

async function migrateUploadFiles() {
  const uploadsDir = path.join(ROOT, "public/uploads");
  let files = [];
  try {
    files = (await readdir(uploadsDir)).filter((f) => /^[A-Za-z0-9._-]+$/.test(f));
  } catch {
    return;
  }
  const CHUNK = 512 * 1024;
  for (const file of files) {
    try {
      const exists = await dest.execute(
        `SELECT 1 FROM "MediaBlob" WHERE filename='${file}' LIMIT 1;`,
      );
      if (exists.rows.length > 0) continue;
      const buf = await readFile(path.join(uploadsDir, file));
      const b64 = buf.toString("base64");
      const total = Math.max(1, Math.ceil(b64.length / CHUNK));
      for (let i = 0; i < total; i++) {
        await dest.execute(
          `INSERT INTO "MediaBlob" ("id", "filename", "chunkIndex", "data", "createdAt") VALUES ('seed-${file}-${i}', '${file}', ${i}, '${b64.slice(i * CHUNK, (i + 1) * CHUNK)}', datetime('now'));`,
        );
      }
      console.log(`[netlify-init]   uploads/${file} → ${total} DB chunks`);
    } catch (e) {
      console.warn(`[netlify-init]   uploads/${file}: skipped (${e.message})`);
    }
  }
}

console.log(`[netlify-init] Target: ${DEST_URL}`);
await ensureSchema();
const seeded = await copySeedData();
await migrateUploadFiles();
console.log(
  seeded
    ? "[netlify-init] ✅ Seed complete — your site now has all content."
    : "[netlify-init] ✅ Existing data preserved.",
);
