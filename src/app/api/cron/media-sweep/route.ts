import { NextResponse } from "next/server";
import { env } from "@/env";
import { keysMatch } from "@/server/services/orders";
import { sweepOrphanMedia } from "@/server/services/media-sweep";

/**
 * Unreferenced catalogue uploads older than 7 days (plan.md §8.5). Reports only; `?apply=1`
 * deletes (up to 200 per run). Needs the cron secret.
 */
export const maxDuration = 120;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!keysMatch(auth, `Bearer ${env.CRON_SECRET}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const apply = new URL(request.url).searchParams.get("apply") === "1";
  const result = await sweepOrphanMedia({ apply });
  console.log(JSON.stringify({ evt: "cron.media_sweep", apply, ...result, sample: undefined }));
  return NextResponse.json({ ok: true, apply, ...result });
}
