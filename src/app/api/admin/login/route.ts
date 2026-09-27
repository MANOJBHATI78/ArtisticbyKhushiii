import { db, describeDbError } from "@/lib/db";
import { createSession, sessionCookie, verifyPassword } from "@/lib/auth";
import { fail, ok, rateLimit } from "@/lib/server-utils";
import { clientIp, readJsonBody, str } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // rate limit: 10 attempts / 15 min per IP
    const ip = clientIp(request);
    if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return fail("Too many login attempts. Please try again in 15 minutes.", 429);
    }

    const body = await readJsonBody(request);
    if (!body) return fail("Invalid request body.", 400);

    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return fail("Invalid email or password", 401);
    }

    const user = await db.adminUser.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return fail("Invalid email or password", 401);
    }

    const { token, expiresAt } = await createSession(user.id);
    const res = ok({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    res.headers.append("Set-Cookie", sessionCookie(token, expiresAt));
    return res;
  } catch (e) {
    console.error("[api/admin/login]", e);
    // Surface the real reason (DB unreachable/empty) instead of a generic 500,
    // so a live deployment can be diagnosed from the login screen itself.
    return fail(
      `Server error — database not reachable. Detail: ${describeDbError(e)} (open /api/health for full diagnostics)`,
      500,
    );
  }
}
