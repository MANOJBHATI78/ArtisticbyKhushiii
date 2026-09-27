import { NextResponse } from "next/server";
import { APP_VERSION, db, describeDbError, getDbInfo } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public self-diagnostics — open /api/health on any deployment to see exactly
 * why the site would (not) work: database mode, connectivity, row counts and
 * a ready-made fix hint. Never exposes secrets (URLs are masked to host).
 */
export async function GET() {
  const info = getDbInfo();

  const counts: Record<string, number> = {};
  const runtimeName =
    (globalThis as unknown as { Bun?: unknown }).Bun !== undefined ? "bun" : "node";
  let dbOk = false;
  let error: string | null = null;
  try {
    // Real queries through the full Prisma → adapter → DB path.
    counts.adminUsers = await db.adminUser.count();
    counts.categories = await db.category.count();
    counts.products = await db.product.count();
    counts.blogs = await db.blogPost.count();
    counts.leads = await db.lead.count();
    counts.settings = await db.siteSetting.count();
    dbOk = counts.adminUsers > 0 && counts.products > 0;
  } catch (e) {
    error = describeDbError(e);
  }

  let fix: string;
  if (dbOk) {
    fix =
      info.mode === "tmp-fallback"
        ? "Site works, but the database is TEMPORARY (no writable disk and no Turso URL set) — set DATABASE_URL + DATABASE_AUTH_TOKEN so changes persist."
        : "All good — database connected and seeded.";
  } else if (info.mode === "turso") {
    fix = info.urlEnvSet
      ? "Turso cloud database is configured but NOT reachable/seeded. Check DATABASE_URL (libsql://…turso.io) and DATABASE_AUTH_TOKEN in your host's environment variables, then redeploy."
      : "DATABASE_URL is missing. Add DATABASE_URL (libsql://…turso.io) + DATABASE_AUTH_TOKEN in your host's environment variables, then redeploy.";
  } else if (error) {
    fix = `Local database error: ${error}`;
  } else {
    fix = "Database reachable but empty — re-run the deploy so the snapshot seed runs.";
  }

  return NextResponse.json(
    {
      ok: dbOk,
      app: {
        version: APP_VERSION,
        env: process.env.NODE_ENV ?? "unknown",
        runtime: `${runtimeName} ${process.version}`,
        uptimeSec: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      db: { ...info, counts, error },
      fix,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
