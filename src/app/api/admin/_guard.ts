import { fail } from "@/lib/server-utils";
import { getSessionUser } from "@/lib/auth";

export type AdminUser = { id: string; email: string; name: string; role: string };

/**
 * Shared admin guard. Usage:
 *   const { user, error } = await requireAdmin(request);
 *   if (error) return error;
 */
export async function requireAdmin(
  request: Request,
): Promise<{ user: AdminUser; error: null } | { user: null; error: ReturnType<typeof fail> }> {
  const user = await getSessionUser(request);
  if (!user) {
    return { user: null, error: fail("Unauthorized", 401) };
  }
  return { user, error: null };
}
