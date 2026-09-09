import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Single database client that works EVERYWHERE:
 *  • Local dev / Docker  → DATABASE_URL=file:…      (SQLite file on disk/volume)
 *  • Netlify / serverless → DATABASE_URL=libsql://…  (Turso cloud SQLite)
 * Both are handled by the libSQL driver-adapter (PrismaLibSQL is a factory
 * that takes the connection config, not a client instance).
 */
function createDb(): PrismaClient {
  const url = process.env.DATABASE_URL || "file:../db/custom.db";
  const authToken =
    process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

  const adapter = new PrismaLibSQL(authToken ? { url, authToken } : { url });

  return new PrismaClient({
    adapter,
    // Query logs are handy in development but far too noisy for production.
    log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["query"],
  });
}

export const db = globalForPrisma.prisma ?? createDb();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
