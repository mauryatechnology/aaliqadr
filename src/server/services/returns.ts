import "server-only";
import { after } from "next/server";
import { env } from "@/env";
import { site } from "@/config/site";
import { routes } from "@/lib/routes";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { AuditLog, Counter, Payment } from "@/server/models/commerce";
import { RETURN_REASONS, ReturnRequest, type ReturnDoc, type ReturnReason, type ReturnStatus } from "@/server/models/engagement";
import { sendMail } from "@/server/email/mailer";
import { adminNewReturnEmail, returnUpdateEmail } from "@/server/email/templates";
import { refundPayment } from "@/server/integrations/razorpay";
import { getSettings } from "./settings";
import type { Actor } from "./inventory";

/**
 * Damage, leak and wrong-item claims (docs/08 §5). Opened perfume isn't returnable, so a claim
 * needs photo/video evidence and is raised within the window after delivery. Resolution is a
 * refund (Razorpay for prepaid orders, recorded manually for COD) or a replacement.
 */

export class ReturnError extends Error {}

const OPEN: ReturnStatus[] = ["requested", "approved", "received"];

const NEXT: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["received", "refunded", "replaced", "rejected"],
  received: ["refunded", "replaced"],
  refunded: ["closed"],
  replaced: ["closed"],
  rejected: ["closed"],
  closed: [],
};
export const canMoveReturn = (from: ReturnStatus, to: ReturnStatus) => NEXT[from].includes(to);
export const nextReturnStatuses = (from: ReturnStatus) => NEXT[from];

function orderLink(o: Pick<OrderDoc, "_id" | "accessKey">) {
  return new URL(routes.order(o._id, o.accessKey), site.url).toString();
}

/** Whether a delivered order can still get a claim, and until when. */
export async function claimWindow(o: Pick<OrderDoc, "status" | "shipment">): Promise<{ open: boolean; until?: Date }> {
  if (o.status !== "delivered" || !o.shipment?.deliveredAt) return { open: false };
  const { returnWindowHours } = await getSettings();
  const until = new Date(new Date(o.shipment.deliveredAt).getTime() + (returnWindowHours ?? 48) * 3600_000);
  return { open: until > new Date(), until };
}

export async function createReturn(
  orderId: string,
  who: { name: string; email: string; userId?: string },
  input: { items: { sku: string; qty: number }[]; reason: ReturnReason; description: string; evidence: { url: string; kind: "image" | "video" }[] },
  /** Raised by staff for a customer who phoned or emailed (plan.md §5): no window or evidence rule. */
  staff?: Actor & { userId: string },
): Promise<ReturnDoc> {
  await db();
  const o = await Order.findById(orderId).select("+accessKey").lean<OrderDoc>();
  if (!o) throw new ReturnError("Order not found.");
  const window = await claimWindow(o);
  if (staff && !["delivered", "shipped"].includes(o.status)) throw new ReturnError("A claim needs a shipped or delivered order.");
  if (!staff && !window.open) throw new ReturnError(o.status === "delivered" ? "The window to report a problem with this order has closed. Please contact us." : "You can report a problem once the order is delivered.");
  if (await ReturnRequest.exists({ orderId, status: { $in: OPEN } })) throw new ReturnError("There's already an open request for this order. We'll update you on it soon.");
  if (!staff && input.reason !== "other" && input.reason !== "missing_item" && input.evidence.length === 0) throw new ReturnError("Add at least one photo or the unboxing video.");

  const items = input.items.map((line) => {
    const item = o.items.find((i) => i.sku === line.sku);
    if (!item) throw new ReturnError("That item isn't in this order.");
    return { sku: item.sku, name: item.name, variantLabel: item.variantLabel, qty: Math.min(Math.max(1, line.qty), item.qty), unitPriceP: item.unitPriceP };
  });
  const seq = (await Counter.findOneAndUpdate({ _id: "return" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" }).lean())!.seq;
  const actor = staff ?? { name: who.name, role: "customer", userId: who.userId };
  const doc = await ReturnRequest.create({
    _id: `RT-${100000 + seq}`,
    orderId,
    userId: who.userId,
    email: o.contact.email,
    name: o.contact.name,
    items,
    reason: input.reason,
    description: input.description,
    evidence: input.evidence,
    status: "requested",
    history: [{ at: new Date(), status: "requested", note: `${staff ? "Raised by our team on your behalf: " : ""}${input.description.slice(0, 300)}`, actor, visibleToCustomer: true }],
  });
  if (staff) await AuditLog.create({ actor: staff, action: "return.create_for_customer", entity: { kind: "return", id: doc._id }, detail: { orderId } });
  const r = doc.toObject() as ReturnDoc;
  after(async () => {
    await sendMail(returnUpdateEmail({ id: r._id, orderId, name: o.contact.name, email: o.contact.email, status: "requested", url: orderLink(o) }));
    await sendMail(adminNewReturnEmail(env.ADMIN_EMAIL, { id: r._id, orderId, reason: RETURN_REASONS[input.reason], name: o.contact.name, adminUrl: new URL(routes.adminReturn(r._id), site.url).toString() }));
  });
  return r;
}

export type ReturnAction =
  | { to: "approved"; resolution: "refund" | "replacement"; note?: string }
  | { to: "rejected"; note: string }
  | { to: "received"; note?: string }
  | { to: "refunded"; amountP: number; note?: string; reference?: string }
  | { to: "replaced"; courier: string; awb: string; note?: string }
  | { to: "closed"; note?: string };

export async function moveReturn(id: string, action: ReturnAction, actor: Actor & { userId: string }): Promise<ReturnDoc> {
  await db();
  const r = await ReturnRequest.findById(id).lean<ReturnDoc>();
  if (!r) throw new ReturnError("Request not found.");
  if (!canMoveReturn(r.status, action.to)) throw new ReturnError(`A ${r.status} request can't be marked ${action.to}.`);
  const o = await Order.findById(r.orderId).select("+accessKey").lean<OrderDoc>();
  if (!o) throw new ReturnError("The order for this request no longer exists.");

  const set: Record<string, unknown> = { status: action.to };
  let note = action.note ?? "";
  if (action.to === "approved") set.resolution = action.resolution;
  if (action.to === "replaced") set.replacement = { courier: action.courier, awb: action.awb, sentAt: new Date() };
  if (action.to === "refunded") {
    const remaining = o.pricing.totalP - (o.payment.refundedP ?? 0);
    if (action.amountP <= 0 || action.amountP > remaining) throw new ReturnError(`Refund must be between ₹1 and the ${(remaining / 100).toFixed(2)} still refundable on this order.`);
    let refundId = action.reference;
    if (o.payment.method === "razorpay" && o.payment.razorpayPaymentId && o.payment.status !== "refunded") {
      const g = await refundPayment(o.payment.razorpayPaymentId, action.amountP, o._id, `Claim ${r._id}`);
      refundId = g.id;
      await Payment.create({ orderId: o._id, kind: "refund", gatewayPaymentId: o.payment.razorpayPaymentId, gatewayRefundId: g.id, amountP: g.amountP, status: g.status, source: "admin" });
    } else {
      // COD orders are refunded by bank transfer / UPI; record the reference.
      await Payment.create({ orderId: o._id, kind: "refund", amountP: action.amountP, status: "processed", method: "manual", source: "admin", raw: { reference: action.reference ?? "" } });
    }
    const refundedP = (o.payment.refundedP ?? 0) + action.amountP;
    await Order.updateOne(
      { _id: o._id },
      {
        $inc: { "payment.refundedP": action.amountP },
        $set: { "payment.status": refundedP >= o.pricing.totalP ? "refunded" : "partially_refunded" },
        $push: { history: { at: new Date(), status: "refund", note: `Refund for claim ${r._id}`, actor, visibleToCustomer: true } },
      },
    );
    set.refundP = action.amountP;
    if (refundId) set.refundId = refundId;
  }
  const visible = action.to !== "received" || !!note;
  if (action.to === "replaced") note = note || `Replacement shipped via ${action.courier}, AWB ${action.awb}`;
  const res = await ReturnRequest.updateOne(
    { _id: r._id, status: r.status },
    { $set: set, $push: { history: { at: new Date(), status: action.to, note, actor, visibleToCustomer: visible } } },
  );
  if (res.modifiedCount !== 1) throw new ReturnError("This request was just updated. Refresh and try again.");
  await AuditLog.create({ actor, action: `return.${action.to}`, entity: { kind: "return", id: r._id }, detail: { orderId: r.orderId } });
  after(() =>
    sendMail(returnUpdateEmail({ id: r._id, orderId: r.orderId, name: r.name, email: r.email, status: action.to, note: action.to === "rejected" || action.to === "approved" ? note : undefined, refundP: action.to === "refunded" ? action.amountP : undefined, awb: action.to === "replaced" ? action.awb : undefined, url: orderLink(o) })).then(() => undefined),
  );
  return { ...r, ...(set as Partial<ReturnDoc>) };
}
