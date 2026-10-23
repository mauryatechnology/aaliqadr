import { NextResponse, type NextRequest } from "next/server";
import { ZODIAC_SLUGS } from "@/config/zodiac";

/**
 * Network boundary (docs/03 §2). Cheap checks only, no data fetching:
 *  - unknown zodiac signs get a real 404 status instead of a streamed (soft) 404.
 * Auth gating for /account and /admin is added in Phase 2; the authoritative checks always
 * live in the page/action itself (docs/06 §3.2).
 */
const SIGNS = new Set<string>(ZODIAC_SLUGS);

export function proxy(request: NextRequest) {
  const [, segment, sign, rest] = request.nextUrl.pathname.split("/");
  if (segment === "zodiac" && sign && !rest && !SIGNS.has(sign)) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/zodiac/:sign"],
};
