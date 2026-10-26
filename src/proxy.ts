import { NextResponse, type NextRequest } from "next/server";
import { ZODIAC_SLUGS } from "@/config/zodiac";

/**
 * Network boundary (docs/03 §2). Cheap checks only, no data fetching:
 *  - unknown zodiac signs get a real 404 status instead of a streamed (soft) 404;
 *  - /admin, /account and /preview without a session cookie go straight to sign-in (plan.md S10).
 * This is defence in depth: the authoritative checks always live in the page/action itself
 * (docs/06 §3.2), since a cookie's presence says nothing about its validity.
 */
const SIGNS = new Set<string>(ZODIAC_SLUGS);
const SESSION_COOKIES = ["aq.session_token", "__Secure-aq.session_token"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, segment, sign, rest] = pathname.split("/");
  if (segment === "zodiac" && sign && !rest && !SIGNS.has(sign)) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
  if ((segment === "admin" || segment === "account" || segment === "preview") && !SESSION_COOKIES.some((c) => request.cookies.has(c))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/zodiac/:sign", "/admin", "/admin/:path*", "/account", "/account/:path*", "/preview/:path*"],
};
