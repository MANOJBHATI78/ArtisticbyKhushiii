import { db } from "@/lib/db";
import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "abk_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

// ---------------- Password hashing (scrypt, no external deps) ----------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split(":");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ---------------- Sessions ----------------

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.adminSession.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await db.adminSession.deleteMany({ where: { token } });
}

export async function getSessionUser(request: Request): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  const token = match[1];
  const session = await db.adminSession.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  // Disabled accounts (admin panel → Users & Roles) are logged out instantly.
  if (session.user.active === false) {
    await db.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return { id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role };
}

/** Invalidates every session of a user except the one making this request. */
export async function deleteOtherSessions(userId: string, keepToken: string): Promise<void> {
  await db.adminSession.deleteMany({
    where: { userId, token: { not: keepToken } },
  });
}

/** Reads the current session token straight from the request cookies. */
export function sessionTokenFromRequest(request: Request): string {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : "";
}

export function sessionCookie(token: string, expiresAt: Date): string {
  const expires = expiresAt.toUTCString();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
