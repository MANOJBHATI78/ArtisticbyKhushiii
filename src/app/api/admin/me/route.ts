import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return fail("Unauthorized", 401);
    return ok({ user });
  } catch (e) {
    console.error("[api/admin/me]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
