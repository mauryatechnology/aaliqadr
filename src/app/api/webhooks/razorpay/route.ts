import { NextResponse } from "next/server";
import { db } from "@/server/db/connect";
import { WebhookEvent } from "@/server/models/commerce";
import { verifyWebhookSignature, type GatewayPayment } from "@/server/integrations/razorpay";
import { markPaid } from "@/server/services/orders";

/**
 * Razorpay webhook (docs/07 §5). Verify the raw body first, dedupe by event id, then converge on
 * the same idempotent markPaid the checkout callback uses. Events may arrive late, twice or out
 * of order; duplicates and ignored events return 200 so Razorpay stops retrying.
 */
export const maxDuration = 30;

interface RazorpayEvent {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id?: string; amount: number; status: string; method?: string; notes?: { orderId?: string } } } };
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  const evt = JSON.parse(raw) as RazorpayEvent;
  const eventId = request.headers.get("x-razorpay-event-id") ?? `${evt.event}:${evt.payload?.payment?.entity?.id ?? Date.now()}`;

  await db();
  try {
    const now = new Date();
    await WebhookEvent.create({ _id: `razorpay:${eventId}`, provider: "razorpay", type: evt.event, receivedAt: now, expiresAt: new Date(now.getTime() + 90 * 864e5) });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return NextResponse.json({ ok: true, duplicate: true });
    throw e;
  }

  const p = evt.payload?.payment?.entity;
  const orderId = p?.notes?.orderId;
  if ((evt.event === "payment.captured" || evt.event === "order.paid") && p && orderId) {
    const payment: GatewayPayment = { id: p.id, orderId: p.order_id ?? "", amountP: Number(p.amount), status: p.status, method: p.method ?? "" };
    const result = await markPaid(orderId, payment, "webhook");
    console.log(JSON.stringify({ evt: "webhook.razorpay", type: evt.event, orderId, result }));
  } else if (evt.event === "payment.failed" && orderId) {
    // The customer may retry within the reservation window; the sweep releases stock after it.
    console.log(JSON.stringify({ evt: "webhook.razorpay", type: evt.event, orderId }));
  }
  return NextResponse.json({ ok: true });
}
