import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import { after } from "next/server";
import { env } from "@/env";
import { site } from "@/config/site";
import { stateName } from "@/config/india";
import { canTransition, type OrderStatus, type PaymentMethod } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { db } from "@/server/db/connect";
import { Order, type OrderAddress, type OrderDoc, type OrderItem } from "@/server/models/Order";
import { Address, AuditLog, Payment } from "@/server/models/commerce";
import { sendMail } from "@/server/email/mailer";
import { adminNewOrderEmail, orderCancelledEmail, orderConfirmedEmail, orderDeliveredEmail, orderShippedEmail, type OrderEmailData } from "@/server/email/templates";
import { createGatewayOrder, findCapturedPayment, refundPayment, type GatewayPayment } from "@/server/integrations/razorpay";
import { priceCart } from "./pricing";
import { quoteCheckout, type Quote } from "./checkout";
import { checkoutSettings, getSettings, pricingSettings } from "./settings";
import { CouponError, consumeCoupon, releaseCoupon, reserveCoupon, validateCoupon } from "./coupons";
import { commitSale, OutOfStockError, release, reserve, restock, SYSTEM, type Actor, type StockLine } from "./inventory";
import { nextInvoiceNumber, nextOrderId } from "./ids";
import { loadActiveProductsFresh, revalidateProducts } from "./products";

/** Orders (docs/07). Every state change goes through here, inside a transaction where money or stock moves. */

export class OrderError extends Error {
  constructor(
    public readonly code: "PRICE_CHANGED" | "OUT_OF_STOCK" | "COUPON_INVALID" | "COD_UNAVAILABLE" | "EMPTY" | "NOT_FOUND" | "CONFLICT" | "PAYMENT_FAILED" | "UPSTREAM",
    message: string,
    public readonly quote?: Quote,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export interface CheckoutContact {
  name: string;
  email: string;
  phone: string;
}

export interface CheckoutAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  stateCode: string;
  pincode: string;
}

export interface QuoteRequest {
  lines: { sku: string; qty: number }[];
  method: PaymentMethod;
  giftWrap: boolean;
  stateCode: string;
  couponCode?: string;
  email?: string;
}

const actorOf = (u?: { id: string; name: string; role: string }): Actor => (u ? { name: u.name, role: u.role, userId: u.id } : { name: "Customer", role: "customer" });

/** Prices a checkout from fresh catalogue data. Used by the quote action and by placeOrder. */
export async function buildQuote(req: QuoteRequest): Promise<{ quote: Quote; warnings: string[] }> {
  const [settings, products] = await Promise.all([getSettings(), loadActiveProductsFresh()]);
  const cart = priceCart(req.lines, products, pricingSettings(settings));
  if (cart.lines.length === 0) throw new OrderError("EMPTY", "Your bag is empty.");
  let coupon;
  if (req.couponCode?.trim()) {
    try {
      coupon = await validateCoupon(req.couponCode, req.email, cart.subtotalP);
    } catch (e) {
      if (e instanceof CouponError) throw new OrderError("COUPON_INVALID", e.message);
      throw e;
    }
  }
  const quote = quoteCheckout({
    cart,
    method: req.method,
    giftWrap: req.giftWrap,
    shipToStateCode: req.stateCode,
    storeStateCode: site.legal.stateCode,
    coupon,
    settings: checkoutSettings(settings),
  });
  return { quote, warnings: cart.warnings };
}

export interface PlaceOrderInput extends QuoteRequest {
  contact: CheckoutContact;
  address: CheckoutAddress;
  giftMessage?: string;
  hidePrice: boolean;
  expectedTotalP: number;
  idempotencyKey: string;
  saveAddress: boolean;
}

export type PlaceOrderResult =
  | { kind: "razorpay"; orderId: string; accessKey: string; razorpay: { keyId: string; orderId: string; amountP: number; name: string; email: string; phone: string } }
  | { kind: "confirmed"; orderId: string; accessKey: string };

function orderUrl(orderId: string, accessKey: string) {
  return new URL(routes.order(orderId, accessKey), site.url).toString();
}

function emailData(o: Pick<OrderDoc, "_id" | "contact" | "pricing" | "payment" | "items">, accessKey: string): OrderEmailData {
  return {
    orderId: o._id,
    name: o.contact.name,
    email: o.contact.email,
    totalP: o.pricing.totalP,
    paymentMethod: o.payment.method,
    items: o.items.map((i) => ({ name: i.name, variantLabel: i.variantLabel, qty: i.qty, lineTotalP: i.lineTotalP - i.discountP })),
    url: orderUrl(o._id, accessKey),
  };
}

function notifyConfirmed(o: OrderDoc) {
  const data = emailData(o, o.accessKey);
  after(async () => {
    await sendMail(orderConfirmedEmail(data));
    await sendMail(adminNewOrderEmail(env.ADMIN_EMAIL, { ...data, adminUrl: new URL(routes.adminOrder(o._id), site.url).toString() }));
  });
}

const stockLines = (items: OrderItem[]): StockLine[] => items.map((i) => ({ productId: i.productId, sku: i.sku, qty: i.qty }));

async function inTransaction<T>(fn: (s: ClientSession) => Promise<T>): Promise<T> {
  await db();
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}

export async function placeOrder(input: PlaceOrderInput, user?: { id: string; name: string; role: string }): Promise<PlaceOrderResult> {
  await db();

  // Idempotency: a double-submit returns the order the first submit created.
  const existing = await Order.findOne({ idempotencyKey: input.idempotencyKey }).select("+accessKey").lean<OrderDoc>();
  if (existing) return resumeExisting(existing);

  const { quote } = await buildQuote({ ...input, stateCode: input.address.stateCode, email: input.contact.email });
  if (input.method === "cod" && !quote.codAvailable) throw new OrderError("COD_UNAVAILABLE", quote.codUnavailableReason ?? "Cash on delivery is unavailable.", quote);
  if (quote.totalP !== input.expectedTotalP) throw new OrderError("PRICE_CHANGED", "Prices or availability changed. Please review your updated total.", quote);

  const accessKey = randomBytes(18).toString("base64url");
  const now = new Date();
  const settings = await getSettings();
  const isCod = input.method === "cod";
  const address: OrderAddress = { ...input.address, state: stateName(input.address.stateCode) };
  const items: OrderItem[] = quote.lines.map((l) => ({
    productId: l.productId,
    slug: l.slug,
    sku: l.sku,
    name: l.name,
    variantLabel: l.variantLabel,
    zodiacSign: l.zodiacSign,
    qty: l.qty,
    mrpP: l.mrpP,
    unitPriceP: l.unitPriceP,
    discountP: l.discountP,
    lineTotalP: l.lineTotalP,
    hsnCode: l.hsnCode,
    gstRateBps: l.gstRateBps,
  }));

  let order: OrderDoc;
  try {
    order = await inTransaction(async (session) => {
      const orderId = await nextOrderId(session);
      const actor = actorOf(user);
      await reserve(stockLines(items), orderId, session, actor);
      if (quote.couponCode) await reserveCoupon(quote.couponCode, input.contact.email, orderId, quote.discountP, session);
      const doc: OrderDoc = {
        _id: orderId,
        userId: user?.id,
        accessKey,
        idempotencyKey: input.idempotencyKey,
        contact: { ...input.contact, email: input.contact.email.toLowerCase() },
        shippingAddress: address,
        items,
        pricing: {
          subtotalP: quote.subtotalP,
          discountP: quote.discountP,
          couponCode: quote.couponCode,
          shippingP: quote.shippingP,
          codFeeP: quote.codFeeP,
          giftWrapP: quote.giftWrapP,
          taxableP: quote.taxableP,
          cgstP: quote.cgstP,
          sgstP: quote.sgstP,
          igstP: quote.igstP,
          totalP: quote.totalP,
        },
        placeOfSupply: { stateCode: input.address.stateCode, isInterState: quote.isInterState },
        gift: { wrap: input.giftWrap, message: input.giftMessage || undefined, hidePrice: input.hidePrice },
        status: isCod ? "confirmed" : "pending_payment",
        payment: { method: input.method, status: "pending", refundedP: 0 },
        reservationExpiresAt: isCod ? undefined : new Date(now.getTime() + settings.reservationMinutes * 60_000),
        history: [{ at: now, status: isCod ? "confirmed" : "pending_payment", note: isCod ? "Placed with cash on delivery" : "Awaiting online payment", actor, visibleToCustomer: true }],
        createdAt: now,
        updatedAt: now,
      };
      if (isCod) {
        await commitSale(stockLines(items), orderId, session, actor);
        if (quote.couponCode) await consumeCoupon(orderId, session);
        doc.invoice = { number: await nextInvoiceNumber(now, session), issuedAt: now };
      }
      await Order.create([doc], { session });
      return doc;
    });
  } catch (e) {
    if (e instanceof OutOfStockError) throw new OrderError("OUT_OF_STOCK", "Something in your bag just sold out. Please review your bag.");
    if (e instanceof CouponError) throw new OrderError("COUPON_INVALID", e.message);
    throw e;
  }

  revalidateProducts(items.map((i) => i.slug));
  if (user && input.saveAddress) after(() => saveAddressForUser(user.id, input.address));

  if (isCod) {
    notifyConfirmed(order);
    return { kind: "confirmed", orderId: order._id, accessKey };
  }
  return startGatewayPayment(order);
}

async function startGatewayPayment(order: Pick<OrderDoc, "_id" | "accessKey" | "pricing" | "contact" | "payment">): Promise<PlaceOrderResult> {
  let gatewayOrderId = order.payment.razorpayOrderId;
  if (!gatewayOrderId) {
    try {
      gatewayOrderId = (await createGatewayOrder(order._id, order.pricing.totalP)).id;
    } catch (e) {
      console.error(JSON.stringify({ evt: "razorpay.order_create_failed", orderId: order._id, error: (e as Error).message }));
      throw new OrderError("UPSTREAM", "We couldn't reach the payment gateway. Your bag is saved: please try again in a moment.");
    }
    await Order.updateOne({ _id: order._id }, { $set: { "payment.razorpayOrderId": gatewayOrderId } });
  }
  return {
    kind: "razorpay",
    orderId: order._id,
    accessKey: order.accessKey,
    razorpay: { keyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID, orderId: gatewayOrderId, amountP: order.pricing.totalP, name: order.contact.name, email: order.contact.email, phone: order.contact.phone },
  };
}

function resumeExisting(o: OrderDoc): Promise<PlaceOrderResult> | PlaceOrderResult {
  if (o.status === "pending_payment") return startGatewayPayment(o);
  return { kind: "confirmed", orderId: o._id, accessKey: o.accessKey };
}

/** Customer retries payment on an order still awaiting it (inside its reservation window). */
export async function retryPayment(orderId: string, accessKey: string): Promise<PlaceOrderResult> {
  await db();
  const o = await Order.findById(orderId).select("+accessKey").lean<OrderDoc>();
  if (!o || !keysMatch(o.accessKey, accessKey)) throw new OrderError("NOT_FOUND", "Order not found.");
  if (o.status !== "pending_payment") throw new OrderError("CONFLICT", "This order no longer needs payment.");
  return startGatewayPayment(o);
}

export function keysMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * The single idempotent convergence point for a captured payment (docs/07 §5): the checkout
 * callback, the webhook and the reconcile cron all call this, in any order, any number of times.
 */
export async function markPaid(orderId: string, p: GatewayPayment, source: "callback" | "webhook" | "reconcile"): Promise<"paid" | "already" | "mismatch" | "refunded_late"> {
  await db();
  const o = await Order.findById(orderId).select("+accessKey").lean<OrderDoc>();
  if (!o) throw new OrderError("NOT_FOUND", `Order ${orderId} not found`);
  if (o.payment.razorpayPaymentId === p.id || o.payment.status === "paid") return "already";
  if (p.status !== "captured" || p.amountP !== o.pricing.totalP || (o.payment.razorpayOrderId && p.orderId && p.orderId !== o.payment.razorpayOrderId)) {
    console.error(JSON.stringify({ evt: "payment.mismatch", orderId, source, expected: o.pricing.totalP, got: p.amountP, status: p.status }));
    return "mismatch";
  }

  const now = new Date();
  const actor: Actor = { name: "Razorpay", role: "system" };
  const outcome = await inTransaction(async (session) => {
    const fromStatus: OrderStatus = o.status;
    if (fromStatus === "cancelled") {
      // Paid after the reservation expired: re-reserve if stock allows, else refund (never keep money without an order).
      try {
        await reserve(stockLines(o.items), o._id, session, actor);
      } catch (e) {
        if (e instanceof OutOfStockError) return "refund" as const;
        throw e;
      }
    } else if (fromStatus !== "pending_payment") {
      return "already" as const;
    }
    const invoiceNumber = await nextInvoiceNumber(now, session);
    const res = await Order.updateOne(
      { _id: o._id, status: fromStatus, "payment.status": { $ne: "paid" } },
      {
        $set: {
          status: "confirmed",
          "payment.status": "paid",
          "payment.razorpayPaymentId": p.id,
          "payment.paidAt": now,
          invoice: { number: invoiceNumber, issuedAt: now },
        },
        $unset: { reservationExpiresAt: 1 },
        $push: { history: { at: now, status: "confirmed", note: `Paid online (${p.method || "Razorpay"})`, actor, visibleToCustomer: true } },
      },
      { session },
    );
    if (res.modifiedCount !== 1) return "already" as const;
    await commitSale(stockLines(o.items), o._id, session, actor);
    if (o.pricing.couponCode) await consumeCoupon(o._id, session);
    await Payment.create([{ orderId: o._id, kind: "payment", gatewayOrderId: p.orderId, gatewayPaymentId: p.id, amountP: p.amountP, status: p.status, method: p.method, source }], { session });
    return "paid" as const;
  });

  if (outcome === "refund") {
    const r = await refundPayment(p.id, p.amountP, o._id, "Paid after the order expired and stock was gone");
    await Order.updateOne(
      { _id: o._id },
      {
        $set: { "payment.status": "refunded", "payment.razorpayPaymentId": p.id, "payment.refundedP": p.amountP },
        $push: { history: { at: now, status: "cancelled", note: "Payment arrived after expiry; refunded automatically", actor, visibleToCustomer: true } },
      },
    );
    await Payment.create({ orderId: o._id, kind: "refund", gatewayPaymentId: p.id, gatewayRefundId: r.id, amountP: r.amountP, status: r.status, source });
    after(() => sendMail(orderCancelledEmail({ ...emailData(o, o.accessKey), refunded: true })).then(() => undefined));
    return "refunded_late";
  }
  if (outcome === "paid") {
    revalidateProducts(o.items.map((i) => i.slug));
    notifyConfirmed({ ...o, payment: { ...o.payment, status: "paid" } });
  }
  return outcome;
}

/** Moves an order forward (staff): processing, shipped (with tracking) or delivered. */
export async function advanceOrder(
  orderId: string,
  to: "processing" | "shipped" | "delivered",
  actor: Actor,
  shipment?: { courier: string; awb: string; trackingUrl?: string },
): Promise<void> {
  await db();
  const o = await Order.findById(orderId).select("+accessKey").lean<OrderDoc>();
  if (!o) throw new OrderError("NOT_FOUND", "Order not found.");
  if (!canTransition(o.status, to)) throw new OrderError("CONFLICT", `An order that is ${o.status.replace("_", " ")} can't be marked ${to}.`);
  const now = new Date();
  const set: Record<string, unknown> = { status: to };
  let note = to === "processing" ? "Being prepared" : to === "delivered" ? "Delivered" : "Handed to courier";
  if (to === "shipped" && shipment) {
    set["shipment.courier"] = shipment.courier;
    set["shipment.awb"] = shipment.awb;
    set["shipment.trackingUrl"] = shipment.trackingUrl;
    set["shipment.shippedAt"] = now;
    note = `Shipped with ${shipment.courier} (${shipment.awb})`;
  }
  if (to === "delivered") {
    set["shipment.deliveredAt"] = now;
    if (o.payment.method === "cod") {
      set["payment.status"] = "paid";
      set["payment.paidAt"] = now;
    }
  }
  const res = await Order.updateOne({ _id: o._id, status: o.status }, { $set: set, $push: { history: { at: now, status: to, note, actor, visibleToCustomer: true } } });
  if (res.modifiedCount !== 1) throw new OrderError("CONFLICT", "This order was just updated by someone else. Refresh and try again.");
  await audit(actor, `order.${to}`, o._id, shipment);

  const base = { orderId: o._id, name: o.contact.name, email: o.contact.email, url: orderUrl(o._id, o.accessKey) };
  if (to === "shipped") after(() => sendMail(orderShippedEmail({ ...base, ...shipment })).then(() => undefined));
  if (to === "delivered") after(() => sendMail(orderDeliveredEmail(base)).then(() => undefined));
}

/**
 * Cancels before dispatch (docs/07 §6, §9). Unpaid: stock returns from reserved. Confirmed:
 * stock returns to sale. A paid online order is refunded in full.
 */
export async function cancelOrder(orderId: string, actor: Actor, reason: string): Promise<{ refunded: boolean }> {
  await db();
  const o = await Order.findById(orderId).select("+accessKey").lean<OrderDoc>();
  if (!o) throw new OrderError("NOT_FOUND", "Order not found.");
  if (!canTransition(o.status, "cancelled")) throw new OrderError("CONFLICT", "This order can no longer be cancelled.");
  const now = new Date();
  await inTransaction(async (session) => {
    const res = await Order.updateOne(
      { _id: o._id, status: o.status },
      { $set: { status: "cancelled" }, $unset: { reservationExpiresAt: 1 }, $push: { history: { at: now, status: "cancelled", note: reason, actor, visibleToCustomer: true } } },
      { session },
    );
    if (res.modifiedCount !== 1) throw new OrderError("CONFLICT", "This order was just updated. Refresh and try again.");
    if (o.status === "pending_payment") await release(stockLines(o.items), o._id, session, actor);
    else await restock(stockLines(o.items), o._id, session, actor);
    if (o.pricing.couponCode) await releaseCoupon(o._id, session);
  });

  let refunded = false;
  if (o.payment.status === "paid" && o.payment.method === "razorpay" && o.payment.razorpayPaymentId) {
    const amount = o.pricing.totalP - (o.payment.refundedP ?? 0);
    const r = await refundPayment(o.payment.razorpayPaymentId, amount, o._id, reason);
    await Order.updateOne(
      { _id: o._id },
      { $set: { "payment.status": "refunded" }, $inc: { "payment.refundedP": r.amountP }, $push: { history: { at: new Date(), status: "refund", note: "Full refund initiated", actor, visibleToCustomer: true } } },
    );
    await Payment.create({ orderId: o._id, kind: "refund", gatewayPaymentId: o.payment.razorpayPaymentId, gatewayRefundId: r.id, amountP: r.amountP, status: r.status, source: actor.role === "system" ? "reconcile" : "admin" });
    refunded = true;
  }
  revalidateProducts(o.items.map((i) => i.slug));
  await audit(actor, "order.cancelled", o._id, { reason, refunded });
  after(() => sendMail(orderCancelledEmail({ orderId: o._id, name: o.contact.name, email: o.contact.email, url: orderUrl(o._id, o.accessKey), refunded })).then(() => undefined));
  return { refunded };
}

/**
 * Cron and lazy sweep (docs/07 §7): for unpaid orders past their window, rescue a captured
 * payment the webhook missed, otherwise cancel and release the stock.
 */
export async function sweepExpiredReservations(limit = 25): Promise<{ rescued: number; released: number }> {
  await db();
  const due = await Order.find({ status: "pending_payment", reservationExpiresAt: { $lt: new Date() } })
    .sort({ reservationExpiresAt: 1 })
    .limit(limit)
    .lean<OrderDoc[]>();
  let rescued = 0;
  let released = 0;
  for (const o of due) {
    try {
      const captured = o.payment.razorpayOrderId ? await findCapturedPayment(o.payment.razorpayOrderId) : null;
      if (captured) {
        if ((await markPaid(o._id, captured, "reconcile")) === "paid") rescued++;
      } else {
        await cancelOrder(o._id, SYSTEM, "Payment not completed in time");
        released++;
      }
    } catch (e) {
      console.error(JSON.stringify({ evt: "sweep.failed", orderId: o._id, error: (e as Error).message }));
    }
  }
  return { rescued, released };
}

async function saveAddressForUser(userId: string, a: CheckoutAddress) {
  const existing = await Address.findOne({ userId, line1: a.line1, pincode: a.pincode });
  if (existing) {
    await Address.updateOne({ _id: existing._id }, { $set: { ...a } });
    return;
  }
  const count = await Address.countDocuments({ userId });
  if (count >= 10) return;
  await Address.create({ ...a, userId, isDefault: count === 0 });
}

export async function audit(actor: Actor, action: string, orderId: string, detail?: unknown) {
  if (!actor.userId) return;
  await AuditLog.create({ actor: { userId: actor.userId, name: actor.name, role: actor.role }, action, entity: { kind: "order", id: orderId }, detail });
}
