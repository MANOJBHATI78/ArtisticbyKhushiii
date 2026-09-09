import path from "path";

/**
 * Directory where admin media uploads are written.
 * Defaults to <project>/public/uploads (works in dev and plain `next start`).
 * Set ABK_UPLOAD_DIR in production (Docker/volume mounts) to a persistent path
 * like /data/public-uploads — files are then served through /api/media/*.
 */
export const UPLOAD_DIR = process.env.ABK_UPLOAD_DIR
  ? path.resolve(process.env.ABK_UPLOAD_DIR)
  : path.join(process.cwd(), "public", "uploads");

/** Public URL prefix uploads are served from (stable — stored in DB rows). */
export const UPLOAD_URL_PREFIX = "/uploads";

/** Maps a stored URL like /uploads/abc.webp to its on-disk path (traversal-safe). */
export function safeUploadPathFromUrl(url: string): string | null {
  const match = url.match(/^\/uploads\/([A-Za-z0-9._-]+)$/);
  if (!match) return null;
  const name = match[1];
  if (name.includes("..")) return null;
  return path.join(UPLOAD_DIR, name);
}
