import { NextResponse, type NextRequest } from "next/server";

// Quick gate: no session cookie -> go to /login. Real checks (valid session, correct role)
// happen in requireRole for every API route and in src/app/staff/layout.tsx for staff pages.
export function proxy(request: NextRequest) {
  const cookieName = process.env.SESSION_COOKIE_NAME ?? "cafeteria_session";
  if (!request.cookies.has(cookieName)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/cart", "/orders", "/wallet"],
};
