import { NextResponse } from "next/server";
import { access } from "fs/promises";
import { db } from "@/lib/db";
import { UPLOAD_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Public health/diagnostics endpoint — NO secrets are exposed (token never
 * included; only the URL scheme + host). Lets the owner (or support) verify
 * a deployment in one request:
 *
 *   GET /api/health
 *   → 200 { healthy: true,  db: { mode: "turso", ok: true, counts: {...} } }
 *   → 503 { healthy: false, db: { ok: false, error: "..." }, hint: "..." }
 */

function dbMode(): { mode: "turso" | "file" | "unset"; urlDisplay: string } {
  const url = process.env.DATABASE_URL || "";
  if (!url) return { mode: "unset", urlDisplay: "(not set)" };
  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    try {
      const host = new URL(url).host;
      return { mode: "turso", urlDisplay: `libsql://${host}` };
    } catch {
      return { mode: "turso", urlDisplay: "libsql://…" };
    }
  }
  return { mode: "file", urlDisplay: url };
}

function hintFor(mode: string): string | undefined {
  if (mode === "file") {
    return "DATABASE_URL ek local file hai — serverless (Netlify) pe ye kabhi nahi chalega. Netlify → Site settings → Environment variables mein Turso ka libsql:// URL + DATABASE_AUTH_TOKEN set karo. Guide: DEPLOYMENT.md";
  }
  if (mode === "unset") {
    return "DATABASE_URL set hi nahi hai. Netlify → Site settings → Environment variables mein DATABASE_URL (Turso) + DATABASE_AUTH_TOKEN add karo. Guide: DEPLOYMENT.md";
  }
  return undefined;
}

export async function GET() {
  const { mode, urlDisplay } = dbMode();
  const runtime = {
    node: process.version,
    env: process.env.NODE_ENV ?? "unknown",
    time: new Date().toISOString(),
  };

  let diskUploadsOk = false;
  try {
    await access(UPLOAD_DIR);
    diskUploadsOk = true;
  } catch {
    diskUploadsOk = false;
  }

  let dbOk = true;
  let dbError: string | undefined;
  let counts: Record<string, number> = {};
  let mediaFiles = 0;

  try {
    const [
      products,
      categories,
      blogs,
      pages,
      faqs,
      leads,
      admins,
      settings,
      mediaChunks,
    ] = await Promise.all([
      db.product.count(),
      db.category.count(),
      db.blogPost.count(),
      db.page.count(),
      db.faq.count(),
      db.lead.count(),
      db.adminUser.count(),
      db.siteSetting.count(),
      db.mediaBlob.count(),
    ]);
    counts = { products, categories, blogs, pages, faqs, leads, admins, settings, mediaChunks };
    const files = await db.mediaBlob.findMany({
      select: { filename: true },
      distinct: ["filename"],
    });
    mediaFiles = files.length;
  } catch (e) {
    dbOk = false;
    dbError = e instanceof Error ? e.message : String(e);
  }

  const body = {
    ok: dbOk,
    healthy: dbOk,
    service: "artistic-by-khushiii",
    runtime,
    db: {
      ok: dbOk,
      mode,
      url: urlDisplay,
      ...(dbError ? { error: dbError } : {}),
      counts,
    },
    uploads: {
      diskDir: UPLOAD_DIR,
      diskAvailable: diskUploadsOk,
      dbChunkFiles: mediaFiles,
      strategy: diskUploadsOk ? "disk + db-mirror" : "db-chunks (serverless)",
    },
    ...(dbOk ? {} : { hint: hintFor(mode) }),
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
