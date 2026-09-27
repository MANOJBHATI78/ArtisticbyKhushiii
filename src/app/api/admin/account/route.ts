import { db, describeDbError } from "@/lib/db";
import { fail, ok } from "@/lib/server-utils";
import { has, readJsonBody, str } from "@/lib/serializers";
import { deleteOtherSessions, getSessionUser, hashPassword, sessionTokenFromRequest, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * PUT /api/admin/account — the logged-in user updates their OWN profile:
 * name, email (login ID) and password. Changing email or password requires
 * the current password and logs out their other devices. (Every role may
 * use this — a VIEWER can still change their own password.)
 */
export async function PUT(request: Request) {
  try {
    const me = await getSessionUser(request);
    if (!me) return fail("Unauthorized", 401);

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const data: { name?: string; email?: string; passwordHash?: string } = {};

    if (has(body, "name")) {
      const name = str(body.name).trim();
      if (name.length < 2 || name.length > 80) return fail("Name must be 2–80 characters.", 400);
      data.name = name;
    }

    const newEmail = str(body.email).trim().toLowerCase();
    const wantsEmailChange = has(body, "email") && newEmail && newEmail !== me.email;
    if (wantsEmailChange && !EMAIL_RE.test(newEmail)) {
      return fail("Please enter a valid email address.", 400);
    }

    const newPassword = str(body.newPassword);
    const wantsPasswordChange = Boolean(newPassword);
    if (wantsPasswordChange && (newPassword.length < 8 || newPassword.length > 100)) {
      return fail("New password must be at least 8 characters.", 400);
    }

    // Security gate: changing the login ID or password always re-checks the current password.
    if (wantsEmailChange || wantsPasswordChange) {
      const currentPassword = str(body.currentPassword);
      if (!currentPassword) return fail("Please enter your current password to make this change.", 400);
      const row = await db.adminUser.findUnique({ where: { id: me.id } });
      if (!row || !verifyPassword(currentPassword, row.passwordHash)) {
        return fail("Current password is incorrect.", 400);
      }
    }

    if (wantsEmailChange) {
      const clash = await db.adminUser.findUnique({ where: { email: newEmail } });
      if (clash) return fail("This email is already used by another team member.", 409);
      data.email = newEmail;
    }
    if (wantsPasswordChange) data.passwordHash = hashPassword(newPassword);

    if (Object.keys(data).length === 0) return fail("Nothing to update.", 400);

    const updated = await db.adminUser.update({ where: { id: me.id }, data });

    // Keep THIS session alive but kill every other device (new password/login ID).
    if (data.email || data.passwordHash) {
      const keep = sessionTokenFromRequest(request);
      if (keep) await deleteOtherSessions(me.id, keep);
    }

    return ok({ user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role } });
  } catch (e) {
    console.error("[api/admin/account PUT]", e);
    return fail("Something went wrong while saving. Please try again.", 500);
  }
}
