import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { env, requireConfigured } from "@/env";

/** Razorpay (docs/07 §3, §5). Amounts are always paise, and always computed by the server. */

let client: Razorpay | null = null;

function rzp(): Razorpay {
  requireConfigured("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET");
  client ??= new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return client;
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function createGatewayOrder(orderId: string, amountP: number) {
  const o = await rzp().orders.create({ amount: amountP, currency: "INR", receipt: orderId, notes: { orderId } });
  return { id: o.id, amount: Number(o.amount) };
}

/** Checkout callback signature: HMAC-SHA256(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(gatewayOrderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${gatewayOrderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256(raw body, webhook secret). Never parse before verifying. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  requireConfigured("RAZORPAY_WEBHOOK_SECRET");
  const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export interface GatewayPayment {
  id: string;
  orderId: string;
  amountP: number;
  status: string;
  method: string;
}

export async function fetchPayment(paymentId: string): Promise<GatewayPayment> {
  const p = await rzp().payments.fetch(paymentId);
  return { id: p.id, orderId: String(p.order_id ?? ""), amountP: Number(p.amount), status: p.status, method: String(p.method ?? "") };
}

/** Captured payment for a gateway order, if any (used to rescue missed webhooks). */
export async function findCapturedPayment(gatewayOrderId: string): Promise<GatewayPayment | null> {
  const res = await rzp().orders.fetchPayments(gatewayOrderId);
  const p = res.items.find((i) => i.status === "captured");
  return p ? { id: p.id, orderId: gatewayOrderId, amountP: Number(p.amount), status: p.status, method: String(p.method ?? "") } : null;
}

export async function refundPayment(paymentId: string, amountP: number, orderId: string, reason: string) {
  const r = await rzp().payments.refund(paymentId, { amount: amountP, notes: { orderId, reason } });
  return { id: r.id, amountP: Number(r.amount), status: r.status };
}
