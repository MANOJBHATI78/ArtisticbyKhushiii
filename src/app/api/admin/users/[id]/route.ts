import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str } from "@/lib/serializers";
import { hashPassword } from "@/lib/auth";
import { isAdminRole, requireAdmin } from "../../_guard";
import { toUserRow } from "../route";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Params = { params: Promise<{ id: string }> };

/** How many active OWNER accounts exist (excluding one user id). */
async function otherActiveOwners(excludeId: string): Promise<number> {
  return db.adminUser.count({ where: { role: "OWNER", active: true, id: { not: excludeId } } });
}

/** PUT /api/admin/users/[id] — edit member / reset password / disable. OWNER only. */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { user: me, error } = await requireAdmin(request, { ownerOnly: true });
    if (error) return error;

    const { id } = await params;
    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const target = await db.adminUser.findUnique({ where: { id } });
    if (!target) return fail("Team member not found.", 404);

    const data: { name?: string; email?: string; role?: string; active?: boolean; passwordHash?: string } = {};

    if (has(body, "name")) {
      const name = str(body.name).trim();
      if (name.length < 2 || name.length > 80) return fail("Name must be 2–80 characters.", 400);
      data.name = name;
    }

    if (has(body, "email")) {
      const email = str(body.email).trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return fail("Please enter a valid email address.", 400);
      if (email !== target.email) {
        const clash = await db.adminUser.findUnique({ where: { email } });
        if (clash) return fail("This email is already used by another team member.", 409);
        data.email = email;
      }
    }

    const demotingSelf = id === me.id && has(body, "role") && str(body.role) !== "OWNER";
    const disablingSelf =
      id === me.id &&
      has(body, "active") &&
      (typeof body.active === "boolean" ? !body.active : str(body.active) === "false");
    if (demotingSelf || disablingSelf) {
      return fail("You cannot remove your own OWNER access or disable yourself. Ask another owner.", 400);
    }

    if (has(body, "role")) {
      const role = str(body.role).trim();
      if (!isAdminRole(role)) return fail("Role must be OWNER, ADMIN or VIEWER.", 400);
      // Last-owner protection when demoting someone else
      if (target.role === "OWNER" && role !== "OWNER" && (await otherActiveOwners(target.id)) === 0) {
        return fail("This is the only OWNER account — promote someone else to OWNER first.", 400);
      }
      data.role = role;
    }

    if (has(body, "active")) {
      const active = typeof body.active === "boolean" ? body.active : str(body.active) === "true";
      if (
        !active &&
        target.role === "OWNER" &&
        target.active &&
        (await otherActiveOwners(target.id)) === 0
      ) {
        return fail("This is the only OWNER account — you cannot disable it.", 400);
      }
      data.active = active;
    }

    const newPassword = str(body.newPassword);
    if (newPassword) {
      if (newPassword.length < 8 || newPassword.length > 100) {
        return fail("New password must be at least 8 characters.", 400);
      }
      data.passwordHash = hashPassword(newPassword);
    }

    if (Object.keys(data).length === 0) return fail("Nothing to update.", 400);

    const updated = await db.adminUser.update({ where: { id }, data });

    // Security: a disabled user, or one whose login ID / password changed,
    // is logged out everywhere (their other sessions die instantly).
    const becameInactive = data.active === false;
    const loginChanged = Boolean(data.email || data.passwordHash);
    if (becameInactive) {
      await db.adminSession.deleteMany({ where: { userId: id } });
    } else if (loginChanged) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/abk_admin_session=([^;]+)/);
      const keepToken = match ? match[1] : "";
      await db.adminSession.deleteMany({
        where: { userId: id, ...(keepToken ? { token: { not: keepToken } } : {}) },
      });
    }

    return ok({ user: toUserRow(updated) });
  } catch (e) {
    console.error("[api/admin/users/[id] PUT]", e);
    return fail("Something went wrong while saving. Please try again.", 500);
  }
}

/** DELETE /api/admin/users/[id] — remove a team member. OWNER only. */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { user: me, error } = await requireAdmin(request, { ownerOnly: true });
    if (error) return error;

    const { id } = await params;
    if (id === me.id) return fail("You cannot delete your own account while logged in.", 400);

    const target = await db.adminUser.findUnique({ where: { id } });
    if (!target) return fail("Team member not found.", 404);

    if (target.role === "OWNER" && (await otherActiveOwners(target.id)) === 0) {
      return fail("This is the only OWNER account — promote someone else to OWNER first.", 400);
    }

    // Sessions cascade-delete via the schema relation.
    await db.adminUser.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("[api/admin/users/[id] DELETE]", e);
    return fail("Something went wrong while deleting. Please try again.", 500);
  }
}
