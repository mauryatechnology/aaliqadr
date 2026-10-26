import { NextResponse } from "next/server";
import { env } from "@/env";
import { keysMatch, sweepExpiredReservations } from "@/server/services/orders";
import { applyCatalogSchedule } from "@/server/services/catalog-schedule";

/** Vercel Cron (docs/13 §4): rescue missed payments, release expired reservations, run scheduled launches. */
export const maxDuration = 120;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!keysMatch(auth, `Bearer ${env.CRON_SECRET}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await sweepExpiredReservations();
  console.log(JSON.stringify({ evt: "cron.release_reservations", ...result }));
  const schedule = await applyCatalogSchedule();
  return NextResponse.json({ ok: true, ...result, schedule });
}
