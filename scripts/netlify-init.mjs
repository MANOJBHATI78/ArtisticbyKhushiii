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

if (!DEST_URL) {
  console.error("[netlify-init] DATABASE_URL is not set — nothing to do.");
  process.exit(0); // non-fatal: plain file: dev/Docker flows don't need this
}
if (!DEST_URL.startsWith("libsql://") && !DEST_URL.startsWith("https://")) {
  // Local file target — dev/Docker data already lives there. (INIT_FORCE=1
  // overrides this so the copier can be tested against a fresh local file.)
  if (!process.env.INIT_FORCE) {
    console.log(`[netlify-init] DATABASE_URL is a local file (${DEST_URL}) — skipping.`);
    process.exit(0);
  }
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
  const hasAdmin = await tableExists("AdminUser");
  if (hasAdmin) {
    console.log("[netlify-init] Tables already exist — skipping DDL.");
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
