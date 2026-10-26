import "server-only";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { AuditLog, Payment } from "@/server/models/commerce";
import { refundPayment } from "@/server/integrations/razorpay";
import { stateName } from "@/config/india";
import type { AddressInput } from "@/schemas/checkout";
import { OrderError } from "./orders";
import type { Actor } from "./inventory";

/**
 * Corrections staff make after an order is placed (plan.md §5, bug B8). Only before dispatch;
 * the state can't change once the tax invoice exists (it decides CGST/SGST vs IGST).
 */

type StaffActor = Actor & { userId: string };
const EDITABLE = ["pending_payment", "confirmed", "processing"];

export async function editOrderDelivery(orderId: string, change: { address: AddressInput; giftMessage?: string }, actor: StaffActor) {
  await db();
  const o = await Order.findById(orderId).lean<OrderDoc>();
  if (!o) throw new OrderError("NOT_FOUND", "Order not found.");
  if (!EDITABLE.includes(o.status)) throw new OrderError("CONFLICT", "The parcel has left: the address can't change now. Contact the courier instead.");
  if (o.invoice?.number && change.address.stateCode !== o.shippingAddress.stateCode) throw new OrderError("CONFLICT", "The invoice already shows this state for GST. To deliver to another state, cancel and place a new order.");
  const set: Record<string, unknown> = { shippingAddress: { ...change.address, state: stateName(change.address.stateCode) } };
  if (change.giftMessage !== undefined && o.gift.wrap) set["gift.message"] = change.giftMessage;
  const res = await Order.updateOne({ _id: orderId, status: { $in: EDITABLE as OrderDoc["status"][] } }, { $set: set, $push: { history: { at: new Date(), status: o.status, note: "Delivery details updated", actor, visibleToCustomer: true } } });
  if (res.modifiedCount !== 1) throw new OrderError("CONFLICT", "The order just changed. Refresh and try again.");
  await AuditLog.create({ actor, action: "order.edit_delivery", entity: { kind: "order", id: orderId }, detail: { before: { address: o.shippingAddress, giftMessage: o.gift.message } } });
}

/**
 * Refunds part of an order outside a claim (goodwill, a missing gift wrap…). Prepaid orders go
 * back through Razorpay; COD refunds are paid by bank/UPI and recorded with their reference.
 */
export async function refundPartOfOrder(orderId: string, amountP: number, reason: string, reference: string | undefined, actor: StaffActor) {
  await db();
  const o = await Order.findById(orderId).lean<OrderDoc>();
  if (!o) throw new OrderError("NOT_FOUND", "Order not found.");
  if (o.status === "pending_payment" || o.status === "cancelled") throw new OrderError("CONFLICT", "Only paid orders can be refunded.");
  if (o.payment.method === "cod" && o.payment.status !== "paid" && o.payment.status !== "partially_refunded") throw new OrderError("CONFLICT", "This COD order hasn't been paid yet.");
  const remaining = o.pricing.totalP - (o.payment.refundedP ?? 0);
  if (amountP <= 0 || amountP > remaining) throw new OrderError("CONFLICT", `Refund must be between ₹1 and ₹${(remaining / 100).toFixed(2)} (still refundable).`);
  if (o.payment.method === "razorpay" && o.payment.razorpayPaymentId) {
    const g = await refundPayment(o.payment.razorpayPaymentId, amountP, o._id, reason.slice(0, 200));
    await Payment.create({ orderId: o._id, kind: "refund", gatewayPaymentId: o.payment.razorpayPaymentId, gatewayRefundId: g.id, amountP: g.amountP, status: g.status, source: "admin" });
  } else {
    if (!reference) throw new OrderError("CONFLICT", "Enter the UPI / bank reference of the refund you paid.");
    await Payment.create({ orderId: o._id, kind: "refund", amountP, status: "processed", method: "manual", source: "admin", raw: { reference } });
  }
  const refundedP = (o.payment.refundedP ?? 0) + amountP;
  await Order.updateOne(
    { _id: o._id },
    {
      $inc: { "payment.refundedP": amountP },
      $set: { "payment.status": refundedP >= o.pricing.totalP ? "refunded" : "partially_refunded" },
      $push: { history: { at: new Date(), status: "refund", note: `Refund of ₹${(amountP / 100).toFixed(2)}: ${reason}`, actor, visibleToCustomer: true } },
    },
  );
  await AuditLog.create({ actor, action: "order.partial_refund", entity: { kind: "order", id: orderId }, detail: { amountP, reason, reference } });
}
