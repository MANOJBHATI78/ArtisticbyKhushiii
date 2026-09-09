import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { db as prisma } from "@/lib/db";

/**
 * Directory where admin media uploads are ALSO written when a writable disk
 * exists (dev + Docker volume). On serverless hosts (Netlify) there is no
 * persistent disk — media lives in the database as MediaBlob chunks and is
 * served through /api/media/*, so /uploads/* URLs work identically.
 */
export const UPLOAD_DIR = process.env.ABK_UPLOAD_DIR
  ? path.resolve(process.env.ABK_UPLOAD_DIR)
  : path.join(process.cwd(), "public", "uploads");

/** Public URL prefix uploads are served from (stable — stored in DB rows). */
export const UPLOAD_URL_PREFIX = "/uploads";

/** Raw bytes per MediaBlob chunk before base64 (kept well under libsql statement limits). */
export const CHUNK_SIZE = 512 * 1024;

/** Maps a stored URL like /uploads/abc.webp to its on-disk path (traversal-safe). */
export function safeUploadPathFromUrl(url: string): string | null {
  const match = url.match(/^\/uploads\/([A-Za-z0-9._-]+)$/);
  if (!match) return null;
  const name = match[1];
  if (name.includes("..")) return null;
  return path.join(UPLOAD_DIR, name);
}

/**
 * Stores an uploaded file's bytes as base64 MediaBlob chunks in the database
 * (serverless-safe persistence). Best-effort: also writes the file to disk
 * when a writable UPLOAD_DIR exists so disk-backed hosts serve it statically.
 */
export async function storeUpload(
  filename: string,
  bytes: Uint8Array,
): Promise<void> {
  const b64 = Buffer.from(bytes).toString("base64");
  const total = Math.max(1, Math.ceil(b64.length / CHUNK_SIZE));
  for (let i = 0; i < total; i++) {
    await prisma.mediaBlob.create({
      data: {
        filename,
        chunkIndex: i,
        data: b64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      },
    });
  }

  // Best-effort disk mirror (dev + Docker). Serverless hosts: fails silently,
  // the DB chunks remain the source of truth.
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  } catch {
    /* no writable disk — database storage is authoritative */
  }
}

/** Removes all DB chunks stored for a filename (missing rows ignored). */
export async function deleteUploadChunks(filename: string): Promise<void> {
  await prisma.mediaBlob.deleteMany({ where: { filename } }).catch(() => {});
}

/** Reads a stored upload from the DB (chunks → bytes), or null if absent. */
export async function readUploadFromDb(
  filename: string,
): Promise<Buffer | null> {
  const rows = await prisma.mediaBlob.findMany({
    where: { filename },
    orderBy: { chunkIndex: "asc" },
    select: { data: true },
  });
  if (rows.length === 0) return null;
  return Buffer.from(rows.map((r) => r.data).join(""), "base64");
}
