import { fail, getSettings, ok } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return ok(settings);
  } catch (e) {
    console.error("[api/public/bootstrap]", e);
    return fail("Something went wrong. Please try again.", 500);
  }
}
