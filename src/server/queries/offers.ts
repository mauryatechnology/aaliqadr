import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db, isDatabaseConfigured } from "@/server/db/connect";
import { Coupon } from "@/server/models/commerce";

/** Coupons the store chose to advertise on product pages (plan.md §10.3). */

export const couponOfferTag = "offers";

export interface Offer {
  code: string;
  text: string;
  minSubtotalP: number;
  endsAt: string;
}

export async function getLiveOffers(): Promise<Offer[]> {
  "use cache";
  // Short-lived: a coupon's start and end times are minute-precise.
  cacheLife("stock");
  cacheTag(couponOfferTag);
  if (!isDatabaseConfigured()) return [];
  await db();
  const now = new Date();
  const rows = await Coupon.find({ isActive: true, showOnProduct: true, startsAt: { $lte: now }, endsAt: { $gte: now } }).sort({ endsAt: 1 }).limit(3).lean();
  return rows
    .filter((c) => !c.usageLimit || c.usedCount < c.usageLimit)
    .map((c) => ({
      code: c.code,
      text: c.kind === "percent" ? `${c.valueBps / 100}% off` : c.kind === "flat" ? `₹${Math.round(c.valueP / 100)} off` : "Free shipping",
      minSubtotalP: c.minSubtotalP,
      endsAt: c.endsAt.toISOString(),
    }));
}
