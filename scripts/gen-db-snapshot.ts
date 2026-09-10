/**
 * Generates src/lib/db-snapshot.json — a portable, self-contained copy of the
 * seed database (schema DDL + every content row) that the app bundles with
 * itself. At runtime, src/lib/db.ts uses it to auto-create + auto-seed the
 * database on ANY host (fresh file, empty Turso DB, /tmp fallback), so the
 * site can never come up empty again.
 *
 * Run:  bun scripts/gen-db-snapshot.ts
 */
import { createClient } from "@libsql/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "db/custom.db");

/** Content tables shipped in the snapshot. Ephemeral data is excluded:
 *  AdminSession (login tokens), Lead (owner's real inquiries), MediaBlob
 *  (upload chunks — served from /public/uploads + DB on real deployments). */
const TABLES = [
  "AdminUser",
  "Category",
  "Product",
  "ProductImage",
  "BlogCategory",
  "BlogPost",
  "Page",
  "Faq",
  "MediaAsset",
  "SiteSetting",
  "HomepageSection",
];

type Cell = string | number | null;
type Row = Record<string, Cell>;

async function main() {
  const db = createClient({ url: `file:${SOURCE}` });

  // ---- 1. Schema DDL (made idempotent with IF NOT EXISTS) ----
  let ddl = await readFile(path.join(ROOT, "scripts/schema.sql"), "utf8");
  ddl = ddl
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "')
    .replace(/CREATE UNIQUE INDEX "/g, 'CREATE UNIQUE INDEX IF NOT EXISTS "')
    .replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "');

  // ---- 2. Rows per table (column list from the live DB itself) ----
  const tables: Record<string, Row[]> = {};
  for (const t of TABLES) {
    const cols = (await db.execute(`PRAGMA table_info("${t}");`)).rows
      .map((r) => String(r.name))
      .filter(Boolean);
    if (cols.length === 0) {
      console.warn(`  ! ${t}: not found in source DB — skipped`);
      continue;
    }
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const rows = (await db.execute(`SELECT ${colList} FROM "${t}";`)).rows;
    tables[t] = rows.map((r) => {
      const row: Row = {};
      for (const c of cols) row[c] = (r[c] ?? null) as Cell;
      return row;
    });
    console.log(`  ${t}: ${rows.length} rows`);
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    schema: ddl,
    tables,
  };

  const out = path.join(ROOT, "src/lib/db-snapshot.json");
  await writeFile(out, JSON.stringify(snapshot), "utf8");
  const kb = Math.round(JSON.stringify(snapshot).length / 1024);
  console.log(`\n✅ Wrote ${out} (${kb} KB)`);
  await db.close();
}

main().catch((e) => {
  console.error("gen-db-snapshot failed:", e);
  process.exit(1);
});
