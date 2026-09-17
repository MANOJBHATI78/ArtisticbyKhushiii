import fs from "fs";
import os from "os";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import type { SqlDriverAdapter } from "@prisma/driver-adapter-utils";
import { createClient, type Client } from "@libsql/client";
import snapshotJson from "./db-snapshot.json";

/** Bump whenever deployment-critical code changes (shown by /api/health). */
export const APP_VERSION = "7.2.0";

// ============================================================
// What this module guarantees — on EVERY host:
//  1. DATABASE_URL=libsql://…  → Turso cloud mode (Netlify/serverless).
//     If the Turso DB is empty, it is schema-created + seeded right here
//     at runtime (build-time netlify-init.mjs is just a faster path).
//  2. DATABASE_URL=file:…     → absolute-path resolved (dev, Docker, VPS).
//     Missing file/tables? Auto-created + seeded from db-snapshot.json.
//  3. DATABASE_URL unset      → bundled db path; if the directory is not
//     writable (serverless) → /tmp fallback seeded from the snapshot, so
//     the site renders immediately instead of showing error screens.
// ============================================================

const SNAPSHOT = snapshotJson as {
  generatedAt: string;
  schema: string;
  tables: Record<string, Record<string, string | number | null>[]>;
};

export type DbMode = "turso" | "file" | "tmp-fallback";

export interface DbInfo {
  mode: DbMode;
  /** Absolute file path (file modes) or host (turso mode). Never a secret. */
  target: string;
  urlEnvSet: boolean;
  tokenEnvSet: boolean;
  seededFromSnapshot: boolean;
  ready: boolean;
  lastError: string | null;
  warnings: string[];
  resolvedAt: string;
}

// ---------------- project root discovery ----------------

function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

// ---------------- target resolution ----------------

interface DbTarget {
  mode: DbMode;
  url: string; // final URL passed to the adapter (always absolute for file:)
  token?: string;
  target: string; // display
  warnings: string[];
}

function resolveTarget(): DbTarget {
  const warnings: string[] = [];
  const raw = process.env.DATABASE_URL?.trim();
  const token =
    process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

  // --- Remote (Turso / libsql / https) ---
  if (raw && /^(libsql|https?|wss?):\/\//i.test(raw)) {
    let host = raw;
    try {
      host = new URL(raw).host;
    } catch {
      /* keep raw string for display */
    }
    return { mode: "turso", url: raw, token, target: host, warnings };
  }

  // --- Local SQLite file (file:… or unset) ---
  const root = findProjectRoot();
  const specified = raw?.startsWith("file:")
    ? raw.slice("file:".length)
    : raw && raw.length > 0
      ? null // a non-file, non-remote value is invalid — treat as unset
      : undefined;

  const candidates: { file: string; label: string }[] = [];
  if (specified) {
    if (path.isAbsolute(specified)) {
      candidates.push({ file: specified, label: "env absolute" });
    } else {
      // Cover every resolution style runtimes have used historically:
      // cwd-relative, prisma/-relative (matches "file:../db/custom.db" in .env),
      // and project-root-relative.
      candidates.push({ file: path.resolve(process.cwd(), specified), label: "cwd-relative" });
      candidates.push({ file: path.resolve(path.join(root, "prisma"), specified), label: "prisma-relative" });
      candidates.push({ file: path.resolve(root, specified), label: "root-relative" });
    }
  } else {
    candidates.push({ file: path.join(root, "db", "custom.db"), label: "bundled db" });
    candidates.push({ file: path.join(process.cwd(), "db", "custom.db"), label: "cwd db" });
  }

  const existing = candidates.find((c) => fs.existsSync(c.file));
  let chosen = existing ?? candidates[0];
  let mode: DbMode = "file";

  // Can we create/write the directory? If not (read-only serverless bundle),
  // fall back to the OS temp dir so the site still boots from the snapshot.
  try {
    fs.mkdirSync(path.dirname(chosen.file), { recursive: true });
    fs.accessSync(path.dirname(chosen.file), fs.constants.W_OK);
  } catch {
    const tmpFile = path.join(os.tmpdir(), "abk-custom.db");
    warnings.push(
      `Directory of ${chosen.file} is not writable — using temporary database ${tmpFile}. ` +
        "Set DATABASE_URL + DATABASE_AUTH_TOKEN (Turso) for permanent storage.",
    );
    chosen = { file: tmpFile, label: "tmp fallback" };
    mode = "tmp-fallback";
  }

  if (!existing && mode === "file") {
    warnings.push(
      `Database file ${chosen.file} did not exist — it will be created and seeded from the bundled snapshot.`,
    );
  }

  return {
    mode,
    url: `file:${chosen.file}`,
    token,
    target: chosen.file,
    warnings,
  };
}

// ---------------- schema migrations (idempotent, always run) ----------------

/**
 * Column/table additions for databases created by OLDER code (e.g. the live
 * Turso DB). Runs on every cold start BEFORE the seed check, so an existing
 * populated database gains new tables/columns without touching any data.
 */
const COLUMN_MIGRATIONS: Record<string, Record<string, string>> = {
  HomepageSection: { mobileImageUrl: "TEXT NOT NULL DEFAULT ''" },
  Category: { mobileImageUrl: "TEXT NOT NULL DEFAULT ''" },
  Testimonial: { source: "TEXT NOT NULL DEFAULT 'admin'" },
};

const TABLE_MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS "LandingPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "subheadline" TEXT NOT NULL DEFAULT '',
    "heroImageUrl" TEXT NOT NULL DEFAULT '',
    "heroMobileImageUrl" TEXT NOT NULL DEFAULT '',
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "customHtml" TEXT NOT NULL DEFAULT '',
    "customCss" TEXT NOT NULL DEFAULT '',
    "customJs" TEXT NOT NULL DEFAULT '',
    "schemaJson" TEXT NOT NULL DEFAULT '',
    "faqsJson" TEXT NOT NULL DEFAULT '[]',
    "productIds" TEXT NOT NULL DEFAULT '[]',
    "categoryIds" TEXT NOT NULL DEFAULT '[]',
    "metaTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "focusKeyword" TEXT NOT NULL DEFAULT '',
    "secondaryKeywords" TEXT NOT NULL DEFAULT '',
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "ogTitle" TEXT NOT NULL DEFAULT '',
    "ogDescription" TEXT NOT NULL DEFAULT '',
    "ogImageUrl" TEXT NOT NULL DEFAULT '',
    "geoRegion" TEXT NOT NULL DEFAULT '',
    "geoPlacename" TEXT NOT NULL DEFAULT '',
    "geoPosition" TEXT NOT NULL DEFAULT '',
    "targetLocations" TEXT NOT NULL DEFAULT '',
    "llmSummary" TEXT NOT NULL DEFAULT '',
    "llmKeywords" TEXT NOT NULL DEFAULT '',
    "ctaText" TEXT NOT NULL DEFAULT '',
    "ctaUrl" TEXT NOT NULL DEFAULT '',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LandingPage_slug_key" ON "LandingPage"("slug");`,
  `CREATE TABLE IF NOT EXISTS "Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL DEFAULT 5,
    "quote" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  );`,
];

async function migrateSchema(client: Client): Promise<void> {
  try {
    for (const [table, columns] of Object.entries(COLUMN_MIGRATIONS)) {
      const info = await client.execute(`PRAGMA table_info("${table}");`);
      if (info.rows.length === 0) continue; // table will be created by the DDL below
      const existing = new Set(info.rows.map((r) => String((r as { name?: unknown }).name ?? "")));
      for (const [column, ddl] of Object.entries(columns)) {
        if (!existing.has(column)) {
          await client.execute(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${ddl};`);
          console.log(`[db] Migrated ${table}: added column ${column}.`);
        }
      }
    }
    for (const ddl of TABLE_MIGRATIONS) {
      await client.execute(ddl);
    }
  } catch (e) {
    // Migration is best-effort: a failure here should never take the site down.
    console.warn("[db] Schema migration skipped:", e instanceof Error ? e.message : e);
  }
}

// ---------------- snapshot bootstrap ----------------

async function runSnapshotInit(client: Client): Promise<boolean> {
  // 0. Upgrade older databases (new columns/tables) — never touches data.
  await migrateSchema(client);

  // 1. Do we already have content?
  const check = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='AdminUser';",
  );
  if (check.rows.length > 0) {
    const admin = await client.execute('SELECT COUNT(*) AS n FROM "AdminUser";');
    if (Number(admin.rows[0]?.n ?? 0) > 0) return false; // already seeded
  }

  // 2. Create every table/index (idempotent DDL).
  await client.executeMultiple(SNAPSHOT.schema);

  // 3. Copy content rows (INSERT OR IGNORE keeps it re-run safe).
  for (const [table, rows] of Object.entries(SNAPSHOT.tables)) {
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT OR IGNORE INTO "${table}" (${colList}) VALUES (${placeholders});`;
    for (const row of rows) {
      await client.execute({ sql, args: cols.map((c) => row[c] ?? null) });
    }
  }
  return true; // seeded
}

// ---------------- global singleton state (HMR-safe) ----------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __abkDbState: { target: DbTarget; info: DbInfo; ready: Promise<void> | undefined } | undefined;
};

const state =
  globalForPrisma.__abkDbState ??
  (globalForPrisma.__abkDbState = {
    target: resolveTarget(),
    info: {
      mode: "file",
      target: "",
      urlEnvSet: Boolean(process.env.DATABASE_URL?.trim()),
      tokenEnvSet: Boolean(
        process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
      ),
      seededFromSnapshot: false,
      ready: false,
      lastError: null,
      warnings: [],
      resolvedAt: new Date().toISOString(),
    },
    ready: undefined,
  });

// Keep info in sync with the resolved target.
state.info.mode = state.target.mode;
state.info.target = state.target.target;
state.info.warnings = state.target.warnings;
state.info.urlEnvSet = Boolean(process.env.DATABASE_URL?.trim());
state.info.tokenEnvSet = Boolean(
  process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
);

/** Runs once per process: creates + seeds the DB when needed. */
function ensureDatabaseReady(): Promise<void> {
  if (state.ready) return state.ready;
  state.ready = (async () => {
    const { url, token, mode } = state.target;
    let client: Client | undefined;
    try {
      client = createClient(token ? { url, authToken: token } : { url });
      state.info.seededFromSnapshot = await runSnapshotInit(client);
      state.info.ready = true;
      state.info.lastError = null;
      if (state.info.seededFromSnapshot) {
        console.log(
          `[db] Snapshot bootstrap complete on ${mode} target ${state.target.target} (${SNAPSHOT.generatedAt}).`,
        );
      }
    } catch (e) {
      // Do not cache failures — the next request should retry.
      state.ready = undefined;
      state.info.lastError = describeDbError(e);
      throw e;
    } finally {
      try {
        await client?.close();
      } catch {
        /* ignore close errors */
      }
    }
  })();
  return state.ready;
}

/** Prisma driver adapter that self-initializes the database on connect. */
class AutoInitLibSQL extends PrismaLibSQL {
  async connect(): Promise<SqlDriverAdapter> {
    await ensureDatabaseReady();
    return super.connect();
  }
}

// ---------------- client construction ----------------

function createDb(): PrismaClient {
  const { url, token } = state.target;
  const adapter = new AutoInitLibSQL(token ? { url, authToken: token } : { url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["query"],
  });
}

export const db = globalForPrisma.prisma ?? createDb();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ---------------- diagnostics helpers ----------------

/** Live DB status for /api/health. */
export function getDbInfo(): DbInfo {
  return { ...state.info };
}

/** Compact, secret-free error text for API error envelopes. */
export function describeDbError(e: unknown): string {
  let msg = "unknown error";
  if (e instanceof Error) msg = e.message;
  else if (typeof e === "string") msg = e;
  else {
    try {
      msg = JSON.stringify(e);
    } catch {
      /* keep default */
    }
  }
  msg = msg.replace(/eyJ[A-Za-z0-9._-]+/g, "eyJ***"); // mask JWT-ish tokens
  // Prisma wraps driver errors in a long template (query + code frame + stack).
  // Pull out the single line that carries the actual reason.
  const lines = msg
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const reason =
    lines.find((l) =>
      /SERVER_ERROR|ConnectionFailed|HTTP status|no such table|unable to open|UNAUTHORIZED|FORBIDDEN|timeout|timed out|ECONN|ENOTFOUND|getaddrinfo|DNS|Error querying|Environment variable|not found/i.test(
        l,
      ),
    ) ??
    lines[lines.length - 1] ??
    msg;
  return reason.slice(0, 240);
}

