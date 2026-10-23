"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { RateLimitError, rateLimit } from "@/server/rate-limit";
import { fetchPayment, verifyCheckoutSignature } from "@/server/integrations/razorpay";
import { buildQuote, keysMatch, markPaid, OrderError, placeOrder, retryPayment, type PlaceOrderResult } from "@/server/services/orders";
import type { Quote } from "@/server/services/checkout";
import { db } from "@/server/db/connect";
import { Order, type OrderDoc } from "@/server/models/Order";
import { placeOrderInput, quoteInput, verifyPaymentInput } from "@/schemas/checkout";

/** Checkout server actions (docs/05 §2.3). Results are typed; expected failures never throw. */

export type Fail = { ok: false; error: string; code?: string; fieldErrors?: Record<string, string[]>; quote?: Quote };
export type Result<T> = { ok: true; data: T } | Fail;

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function fail(e: unknown, context: string): Fail {
  if (e instanceof OrderError) return { ok: false, error: e.message, code: e.code, quote: e.quote };
  if (e instanceof RateLimitError) return { ok: false, error: e.message, code: "RATE_LIMITED" };
  console.error(JSON.stringify({ evt: `${context}.failed`, error: (e as Error).message }));
  return { ok: false, error: "Something went wrong on our side. Please try again.", code: "INTERNAL" };
}

function invalid(error: z.ZodError): Fail {
  return { ok: false, error: "Please check the highlighted fields.", code: "VALIDATION", fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> };
}

export async function quoteAction(raw: unknown): Promise<Result<{ quote: Quote; warnings: string[] }>> {
  const parsed = quoteInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  try {
    if (parsed.data.couponCode) await rateLimit("coupon", await clientKey());
    return { ok: true, data: await buildQuote(parsed.data) };
  } catch (e) {
    return fail(e, "quote");
  }
}

export async function placeOrderAction(raw: unknown): Promise<Result<PlaceOrderResult>> {
  const parsed = placeOrderInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await rateLimit("checkout", await clientKey());
    const user = await getSessionUser();
    const input = { ...parsed.data, stateCode: parsed.data.address.stateCode };
    return { ok: true, data: await placeOrder(input, user ?? undefined) };
  } catch (e) {
    return fail(e, "place_order");
  }
}

/**
 * Checkout callback. The signature proves the browser didn't invent the ids; the API fetch
 * proves the money really moved (docs/06 §10). The webhook reaches the same markPaid.
 */
export async function verifyPaymentAction(raw: unknown): Promise<Result<{ status: string }>> {
  const parsed = verifyPaymentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Payment details were incomplete." };
  const v = parsed.data;
  try {
    await db();
    const order = await Order.findById(v.orderId).select("+accessKey").lean<OrderDoc>();
    if (!order || !keysMatch(order.accessKey, v.accessKey) || order.payment.razorpayOrderId !== v.razorpay_order_id) {
      return { ok: false, error: "We couldn't match this payment to your order." };
    }
    if (!verifyCheckoutSignature(v.razorpay_order_id, v.razorpay_payment_id, v.razorpay_signature)) {
      return { ok: false, error: "Payment verification failed. If money was deducted it will be confirmed or refunded automatically." };
    }
    const payment = await fetchPayment(v.razorpay_payment_id);
    const status = await markPaid(order._id, payment, "callback");
    if (status === "mismatch") return { ok: false, error: "Payment is still processing. We'll email you as soon as it's confirmed." };
    return { ok: true, data: { status } };
  } catch (e) {
    return fail(e, "verify_payment");
  }
}

export async function retryPaymentAction(raw: unknown): Promise<Result<PlaceOrderResult>> {
  const parsed = z.object({ orderId: z.string().regex(/^AQ-\d{6,}$/), accessKey: z.string().min(10).max(64) }).strict().safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Order not found." };
  try {
    await rateLimit("checkout", await clientKey());
    return { ok: true, data: await retryPayment(parsed.data.orderId, parsed.data.accessKey) };
  } catch (e) {
    return fail(e, "retry_payment");
  }
}
