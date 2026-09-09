import { readFile, stat } from "fs/promises";
import path from "path";
import { UPLOAD_DIR, readUploadFromDb } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Serves uploaded media files from UPLOAD_DIR.
 * In dev, UPLOAD_DIR is public/uploads so this matches the classic static behaviour;
 * in production (Docker volume) it is the only way /uploads/* URLs reach the disk.
 * Rewritten from /uploads/:path* in next.config.ts (beforeFiles).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (!segments || segments.length === 0) return notFound();

  const name = segments.join("/");
  if (name.includes("..") || name.includes("\0") || name.startsWith("/")) return notFound();

  const filePath = path.join(UPLOAD_DIR, name);
  // Belt & braces traversal guard: must stay inside UPLOAD_DIR.
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) return notFound();

  // 1) Disk mirror (fast path on dev / Docker hosts).
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      const buffer = await readFile(filePath);
      return respond(buffer, fileStat.size, name);
    }
  } catch {
    /* fall through to database */
  }

  // 2) Database chunks (authoritative on serverless hosts like Netlify).
  const fromDb = await readUploadFromDb(name).catch(() => null);
  if (fromDb && fromDb.length > 0) {
    return respond(fromDb, fromDb.length, name);
  }

  return notFound();
}

function respond(buffer: Buffer, size: number, name: string) {
  const ext = path.extname(name).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function notFound() {
  return new Response("Not found", { status: 404 });
}
