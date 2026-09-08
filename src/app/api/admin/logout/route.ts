import { clearSessionCookie, destroySession } from "@/lib/auth";
import { fail, ok } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "abk_admin_session";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    if (match) {
      await destroySession(match[1]).catch(() => {});
    }
    const res = ok({ success: true });
    res.headers.append("Set-Cookie", clearSessionCookie());
    return res;
  } catch (e) {
    console.error("[api/admin/logout]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
