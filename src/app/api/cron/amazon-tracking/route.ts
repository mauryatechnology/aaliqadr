import { NextResponse } from "next/server";
import { env } from "@/env";
import { keysMatch } from "@/server/services/orders";
import { syncAmazonTracking } from "@/server/services/amazonShipping/trackingSync";

export const maxDuration = 120;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!keysMatch(auth, `Bearer ${env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncAmazonTracking();
    console.log(JSON.stringify({ evt: "cron.amazon_tracking", ...summary }));
    return NextResponse.json({ ok: true, ...summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AmazonShipping] Tracking sync cron failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
