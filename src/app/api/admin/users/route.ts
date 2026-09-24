import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { readJsonBody, str } from "@/lib/serializers";
import { hashPassword } from "@/lib/auth";
import { isAdminRole, requireAdmin } from "../_guard";
import type { AdminUserRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function toUserRow(u: { id: string; email: string; name: string; role: string; active: boolean; createdAt: Date; updatedAt: Date }, sessionCount = 0): AdminUserRow {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: (["OWNER", "ADMIN", "VIEWER"].includes(u.role) ? u.role : "OWNER") as AdminUserRow["role"],
    active: u.active,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    sessionCount,
  };
}

/** GET /api/admin/users — list team members with live session counts. OWNER only. */
export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin(request, { ownerOnly: true });
    if (error) return error;

    const users = await db.adminUser.findMany({
      orderBy: [{ createdAt: "asc" }],
    });
    const now = new Date();
    const liveSessions = await db.adminSession.groupBy({ by: ["userId"], where: { expiresAt: { gt: now } }, _count: { _all: true } });
    const liveMap = new Map(liveSessions.map((s) => [s.userId, s._count._all]));
    return ok({ users: users.map((u) => toUserRow(u, liveMap.get(u.id) ?? 0)) });
  } catch (e) {
    console.error("[api/admin/users GET]", e);
    return fail(`Server error — database not reachable. Detail: ${describeDbError(e)}`, 500);
  }
}

/** POST /api/admin/users — add a team member. OWNER only. */
export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request, { ownerOnly: true });
    if (error) return error;

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const name = str(body.name).trim();
    if (name.length < 2 || name.length > 80) return fail("Please enter a name (2–80 characters).", 400);

    const email = str(body.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return fail("Please enter a valid email address (this will be their login ID).", 400);

    const password = str(body.password);
    if (password.length < 8 || password.length > 100) return fail("Password must be at least 8 characters.", 400);

    const role = str(body.role).trim() || "ADMIN";
    if (!isAdminRole(role)) return fail("Role must be OWNER, ADMIN or VIEWER.", 400);

    const existing = await db.adminUser.findUnique({ where: { email } });
    if (existing) return fail("This email is already used by another team member.", 409);

    const user = await db.adminUser.create({
      data: { name, email, role, active: true, passwordHash: hashPassword(password) },
    });
    return ok({ user: toUserRow(user) });
  } catch (e) {
    console.error("[api/admin/users POST]", e);
    return fail("Something went wrong while creating the user. Please try again.", 500);
  }
}
