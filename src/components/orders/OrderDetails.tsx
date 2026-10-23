import Link from "next/link";
import { Check, FileText, Package, Truck } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { customerCanCancel, PAYMENT_LABEL, PROGRESS_STEPS, STATUS_LABEL } from "@/lib/order-status";
import { cn } from "@/lib/cn";
import { routes } from "@/lib/routes";
import type { OrderView } from "@/server/queries/account";
import { BottleArt } from "@/components/zodiac/BottleArt";
import { CancelOrderButton, RetryPaymentButton } from "./OrderActions";

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

/** Customer view of one order: status, payment, items, totals, address and timeline. */
export function OrderDetails({ order, accessKey, showKeyInLinks }: { order: OrderView; accessKey: string; showKeyInLinks: boolean }) {
  const stepIndex = PROGRESS_STEPS.indexOf(order.status);
  const ended = order.status === "cancelled" || order.status === "returned";
  const tax = order.pricing.cgstP + order.pricing.sgstP + order.pricing.igstP;
  const invoiceHref = routes.invoice(order._id, showKeyInLinks ? accessKey : undefined);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-6">
        <section className="surface flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Order {order._id}</p>
              <h2 className="mt-2 font-display text-4xl">{STATUS_LABEL[order.status]}</h2>
              <p className="mt-1 text-sm text-muted">Placed {dateFmt.format(new Date(order.createdAt))}</p>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", order.payment.status === "paid" ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-fg")}>
              {order.payment.method === "cod" ? "Cash on delivery" : "Online"} · {PAYMENT_LABEL[order.payment.status]}
            </span>
          </div>

          {order.status === "pending_payment" && (
            <div className="flex flex-col gap-3 rounded-xl border border-gold/40 bg-gold/5 p-4">
              <p className="text-sm">We&apos;re holding your items while you complete payment. Unpaid orders are released after 30 minutes.</p>
              <RetryPaymentButton orderId={order._id} accessKey={accessKey} />
            </div>
          )}

          {!ended && order.status !== "pending_payment" && (
            <ol className="grid grid-cols-4 gap-2" aria-label="Progress">
              {PROGRESS_STEPS.map((s, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={s} className="flex flex-col gap-2">
                    <span className={cn("h-1.5 rounded-full", done ? "bg-gold" : "bg-white/10")} />
                    <span className={cn("flex items-center gap-1 text-xs", done ? "text-fg" : "text-muted")}>
                      {done && <Check className="size-3.5 text-gold" aria-hidden />}
                      {STATUS_LABEL[s]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {order.shipment?.awb && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-4 text-sm">
              <Truck className="size-5 text-gold" aria-hidden />
              <span>
                {order.shipment.courier} · tracking <span className="font-mono">{order.shipment.awb}</span>
              </span>
              {order.shipment.trackingUrl && (
                <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-gold underline underline-offset-4">
                  Track shipment
                </a>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {order.invoice?.number && (
              <Link href={invoiceHref} className="flex items-center gap-2 text-sm text-gold underline-offset-4 hover:underline">
                <FileText className="size-4" aria-hidden /> Invoice {order.invoice.number}
              </Link>
            )}
            {customerCanCancel(order.status) && <CancelOrderButton orderId={order._id} accessKey={showKeyInLinks ? accessKey : undefined} />}
          </div>
        </section>

        <section className="surface flex flex-col gap-4 p-6 sm:p-8" aria-labelledby="items-h">
          <h3 id="items-h" className="flex items-center gap-2 font-display text-2xl">
            <Package className="size-5 text-gold" aria-hidden /> Items
          </h3>
          <ul className="flex flex-col divide-y divide-white/10">
            {order.items.map((i) => (
              <li key={i.sku} className="flex items-center gap-4 py-4" data-zodiac={i.zodiacSign}>
                <div className="grid h-20 w-16 shrink-0 place-items-center rounded-lg p-1" style={{ background: "radial-gradient(circle at 50% 35%, var(--z-g2), var(--z-bg) 85%)" }}>
                  <BottleArt sign={i.zodiacSign} className="h-full w-auto" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="font-display text-xl">{i.name}</span>
                  <span className="text-sm text-muted">
                    {i.variantLabel} × {i.qty}
                  </span>
                </div>
                <span className="text-right">
                  {formatPrice(i.lineTotalP - i.discountP)}
                  {i.discountP > 0 && <s className="block text-xs text-muted">{formatPrice(i.lineTotalP)}</s>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface flex flex-col gap-4 p-6 sm:p-8" aria-labelledby="timeline-h">
          <h3 id="timeline-h" className="font-display text-2xl">
            Timeline
          </h3>
          <ol className="flex flex-col gap-4 border-l border-white/15 pl-5">
            {[...order.history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span aria-hidden className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-gold" />
                <p className="text-sm font-medium">{h.note ?? STATUS_LABEL[h.status as keyof typeof STATUS_LABEL] ?? h.status}</p>
                <p className="text-xs text-muted">{dateFmt.format(new Date(h.at))}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="flex h-fit flex-col gap-6">
        <section className="surface flex flex-col gap-3 p-6" aria-labelledby="sum-h">
          <h3 id="sum-h" className="eyebrow">
            Summary
          </h3>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Subtotal" value={formatPrice(order.pricing.subtotalP)} />
            {order.pricing.discountP > 0 && <Row label={`Discount${order.pricing.couponCode ? ` (${order.pricing.couponCode})` : ""}`} value={`− ${formatPrice(order.pricing.discountP)}`} />}
            <Row label="Shipping" value={order.pricing.shippingP ? formatPrice(order.pricing.shippingP) : "Free"} />
            {order.pricing.giftWrapP > 0 && <Row label="Gift wrap" value={formatPrice(order.pricing.giftWrapP)} />}
            {order.pricing.codFeeP > 0 && <Row label="COD fee" value={formatPrice(order.pricing.codFeeP)} />}
            <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="font-display text-3xl">{formatPrice(order.pricing.totalP)}</dd>
            </div>
            <p className="text-xs text-muted">Includes {formatPrice(tax)} GST</p>
            {order.payment.refundedP > 0 && <Row label="Refunded" value={formatPrice(order.payment.refundedP)} />}
          </dl>
        </section>
        <section className="surface flex flex-col gap-2 p-6 text-sm" aria-labelledby="ship-h">
          <h3 id="ship-h" className="eyebrow mb-1">
            Delivering to
          </h3>
          <p className="font-medium">{order.shippingAddress.fullName}</p>
          <p className="text-muted">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
          </p>
          <p className="text-muted">{order.shippingAddress.phone}</p>
          {order.gift.wrap && <p className="mt-2 text-gold">Gift wrapped{order.gift.message ? `: “${order.gift.message}”` : ""}</p>}
        </section>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
