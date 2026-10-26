import "server-only";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { Address, type AddressDoc } from "@/server/models/commerce";
import { keysMatch } from "@/server/services/orders";
import { claimWindow } from "@/server/services/returns";
import { ReturnRequest, type ReturnDoc } from "@/server/models/engagement";
import type { SessionUser } from "@/server/auth";
import { hasRole } from "@/server/auth";

/** Per-user reads (never cached: personal data, docs/03 §5). */

export interface SavedAddressDTO {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  stateCode: string;
  pincode: string;
}

export async function getAddresses(userId: string): Promise<SavedAddressDTO[]> {
  await db();
  const docs = await Address.find({ userId }).sort({ isDefault: -1, updatedAt: -1 }).limit(10).lean<(AddressDoc & { _id: { toString(): string } })[]>();
  return docs.map((a) => ({
    id: a._id.toString(),
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 || undefined,
    landmark: a.landmark || undefined,
    city: a.city,
    stateCode: a.stateCode,
    pincode: a.pincode,
  }));
}

export type OrderView = Omit<OrderDoc, "accessKey" | "idempotencyKey" | "notesInternal">;

/**
 * An order for whoever is looking: its owner, staff, or a guest holding the link's key.
 * Ownership is part of the check, never inferred from the id alone (docs/06 §3.2).
 */
export async function getOrderForViewer(orderId: string, viewer: SessionUser | null, key?: string): Promise<{ order: OrderView; accessKey: string } | null> {
  if (!/^AQ-\d{6,}$/.test(orderId)) return null;
  await db();
  const o = await Order.findById(orderId).select("+accessKey").lean<OrderDoc>();
  if (!o) return null;
  const ownsByAccount = !!viewer && o.userId === viewer.id;
  // A guest order placed with the same (verified) email shows up in that customer's account too.
  const ownsByEmail = !!viewer && !o.userId && o.contact.email === viewer.email.toLowerCase();
  const allowed = keysMatch(o.accessKey, key) || ownsByAccount || ownsByEmail || hasRole(viewer, "staff");
  if (!allowed) return null;
  const { accessKey, idempotencyKey: _i, notesInternal: _n, ...order } = o;
  return { order: { ...order, history: order.history.filter((h) => h.visibleToCustomer) }, accessKey };
}

export async function listOrdersForUser(user: SessionUser, limit = 50) {
  await db();
  return Order.find({ $or: [{ userId: user.id }, { "contact.email": user.email.toLowerCase(), userId: { $exists: false } }] })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("_id createdAt status pricing.totalP payment.method payment.status items.name items.qty items.zodiacSign")
    .lean<Pick<OrderDoc, "_id" | "createdAt" | "status" | "pricing" | "payment" | "items">[]>();
}

/** Claims on an order, with only the history the customer should see, and whether one can be raised. */
export async function getClaimsForOrder(order: Pick<OrderDoc, "_id" | "status" | "shipment">) {
  await db();
  const [claims, window] = await Promise.all([
    ReturnRequest.find({ orderId: order._id }).sort({ createdAt: -1 }).lean<ReturnDoc[]>(),
    claimWindow(order),
  ]);
  const open = claims.some((c) => ["requested", "approved", "received"].includes(c.status));
  return {
    canClaim: window.open && !open,
    until: window.until?.toISOString(),
    claims: claims.map((c) => ({
      id: c._id,
      status: c.status,
      reason: c.reason,
      createdAt: c.createdAt.toISOString(),
      refundP: c.refundP,
      replacementAwb: c.replacement?.awb,
      history: c.history.filter((h) => h.visibleToCustomer).map((h) => ({ at: new Date(h.at).toISOString(), status: h.status, note: h.note })),
    })),
  };
}

/** Whether this user can sign in with a password (has a credential account). */
export async function hasPasswordAccount(userId: string): Promise<boolean> {
  const conn = await db();
  const { ObjectId } = await import("mongodb");
  const ids: unknown[] = [userId];
  if (ObjectId.isValid(userId)) ids.push(new ObjectId(userId));
  return !!(await conn.connection.db!.collection("account").findOne({ userId: { $in: ids }, providerId: "credential" }, { projection: { _id: 1 } }));
}
