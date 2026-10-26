import { NextResponse } from "next/server";
import { env } from "@/env";
import { keysMatch } from "@/server/services/orders";
import { applyCatalogSchedule } from "@/server/services/catalog-schedule";

/**
 * Scheduled launches and take-downs (plan.md §8.5). The daily cron runs them too; call this
 * one hourly from any scheduler (with the cron secret) for precise launch times.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!keysMatch(auth, `Bearer ${env.CRON_SECRET}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await applyCatalogSchedule()) });
}
