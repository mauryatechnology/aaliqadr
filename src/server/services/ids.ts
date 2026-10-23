import "server-only";
import type { ClientSession } from "mongoose";
import { Counter } from "@/server/models/commerce";

/** Human-readable ids from atomic counters (docs/04 §4.16). */

async function next(key: string, session?: ClientSession): Promise<number> {
  const c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after", session }).lean();
  if (!c) throw new Error(`Counter ${key} failed`);
  return c.seq;
}

export async function nextOrderId(session?: ClientSession): Promise<string> {
  return `AQ-${100000 + (await next("order", session))}`;
}

/** Indian financial year label for a date, e.g. 2026-27 (April to March). */
export function financialYear(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Consecutive per financial year, minted only when an order is confirmed, so there are no gaps. */
export async function nextInvoiceNumber(at: Date, session?: ClientSession): Promise<string> {
  const fy = financialYear(at);
  const seq = await next(`invoice:${fy}`, session);
  return `INV/${fy}/${String(seq).padStart(5, "0")}`;
}
