import "server-only";
import type { ClientSession } from "mongoose";
import { db } from "@/server/db/connect";
import { Coupon, CouponRedemption, type CouponDoc } from "@/server/models/commerce";
import { formatPrice } from "@/lib/money";
import type { CouponRule } from "./checkout";

/** Coupon validation and redemption (docs/07 §4). The first failing check is the reason shown. */

export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export function toRule(c: Pick<CouponDoc, "code" | "kind" | "valueBps" | "valueP" | "maxDiscountP" | "minSubtotalP">): CouponRule {
  return { code: c.code, kind: c.kind, valueBps: c.valueBps, valueP: c.valueP, maxDiscountP: c.maxDiscountP, minSubtotalP: c.minSubtotalP };
}

/** Returns the rule, or throws CouponError with a customer-readable reason. */
export async function validateCoupon(rawCode: string, email: string | undefined, subtotalP: number, now = new Date()): Promise<CouponRule> {
  await db();
  const code = rawCode.trim().toUpperCase();
  const c = await Coupon.findOne({ code }).lean<CouponDoc>();
  if (!c || !c.isActive) throw new CouponError("This code isn't valid.");
  if (now < c.startsAt) throw new CouponError("This code isn't active yet.");
  if (now > c.endsAt) throw new CouponError("This code has expired.");
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) throw new CouponError("This code has been fully redeemed.");
  if (subtotalP < c.minSubtotalP) throw new CouponError(`Add ${formatPrice(c.minSubtotalP - subtotalP)} more to use this code.`);
  if (email && c.perCustomerLimit > 0) {
    const used = await CouponRedemption.countDocuments({ code, email: email.toLowerCase(), status: { $in: ["reserved", "consumed"] } });
    if (used >= c.perCustomerLimit) throw new CouponError("You've already used this code.");
  }
  return toRule(c);
}

/** Inside the order transaction: global limit via a conditional increment, plus a redemption row. */
export async function reserveCoupon(code: string, email: string, orderId: string, discountP: number, session: ClientSession) {
  const res = await Coupon.updateOne(
    { code, isActive: true, $or: [{ usageLimit: 0 }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] },
    { $inc: { usedCount: 1 } },
    { session },
  );
  if (res.modifiedCount !== 1) throw new CouponError("This code has just been fully redeemed.");
  await CouponRedemption.create([{ code, email: email.toLowerCase(), orderId, discountP, status: "reserved" }], { session });
}

export async function consumeCoupon(orderId: string, session: ClientSession) {
  await CouponRedemption.updateOne({ orderId, status: "reserved" }, { $set: { status: "consumed" } }, { session });
}

export async function releaseCoupon(orderId: string, session: ClientSession) {
  const r = await CouponRedemption.findOneAndUpdate({ orderId, status: { $ne: "released" } }, { $set: { status: "released" } }, { session });
  if (r) await Coupon.updateOne({ code: r.code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
}
