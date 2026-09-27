import { fail } from "@/lib/server-utils";
import { getSessionUser } from "@/lib/auth";

export type AdminUser = { id: string; email: string; name: string; role: string };

/**
 * Roles (stored on AdminUser.role):
 *  - OWNER  full access, including Users & Roles management
 *  - ADMIN  everything except Users & Roles
 *  - VIEWER read-only (dashboard + lists; every mutation is rejected)
 * Unknown/legacy roles keep full access so existing single-admin sites
 * are never locked out by an upgrade.
 */
export const ADMIN_ROLES = ["OWNER", "ADMIN", "VIEWER"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(v: unknown): v is AdminRole {
  return typeof v === "string" && (ADMIN_ROLES as readonly string[]).includes(v);
}

/** Shared admin guard. Usage:
 *   const { user, error } = await requireAdmin(request);
 *   if (error) return error;
 *
 * Options:
 *   { ownerOnly: true }  → only OWNER may call (users & roles management)
 *
 * VIEWER accounts are automatically rejected on any non-GET request,
 * so existing routes get read-only enforcement without code changes.
 */
export async function requireAdmin(
  request: Request,
  opts: { ownerOnly?: boolean } = {},
): Promise<{ user: AdminUser; error: null } | { user: null; error: ReturnType<typeof fail> }> {
  const user = await getSessionUser(request);
  if (!user) {
    return { user: null, error: fail("Unauthorized", 401) };
  }
  if (opts.ownerOnly && user.role !== "OWNER") {
    return { user: null, error: fail("Users & Roles can only be managed by an OWNER account.", 403) };
  }
  if (user.role === "VIEWER" && request.method !== "GET" && request.method !== "HEAD") {
    return { user: null, error: fail("Your account is view-only. Ask the owner for edit access.", 403) };
  }
  return { user, error: null };
}
