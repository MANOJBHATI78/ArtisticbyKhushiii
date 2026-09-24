import { NextResponse, type NextRequest } from "next/server";

/**
 * Forwards the current URL path to the server-rendered shell via a request
 * header. The root layout reads "x-abk-path" to decide which owner-managed
 * per-page JSON-LD schemas (admin → Schema Manager) to inject into the raw
 * HTML. Static assets and API calls skip this entirely.
 *
 * (Next.js 16 "proxy" — the renamed middleware convention.)
 */
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-abk-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Skip Next internals, static files and API routes — they never need it.
  matcher: [
    "/((?!_next/static|_next/image|api/|images/|uploads/|favicon\\.ico|robots\\.txt|sitemap\\.xml|shopping-feed\\.xml).*)",
  ],
};
