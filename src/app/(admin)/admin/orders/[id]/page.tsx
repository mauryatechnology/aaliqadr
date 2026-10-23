import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { getAdminOrder } from "@/server/admin/queries";
import { AdminSkeleton, Badge, Card, PageHeader, STATUS_TONE } from "@/components/admin/ui";
import { adminDate } from "@/components/admin/format";
import { OrderAdminActions, OrderNoteForm } from "@/components/admin/OrderAdminActions";

export const metadata = { title: "Order" };

export default function Page(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminOrder {...props} />
    </Suspense>
  );
}

async function AdminOrder({ params }: PageProps<"/admin/orders/[id]">) {
  const user = await adminUser();
  if (!user) return null;
  const { id } = await params;
  const data = await getAdminOrder(id);
  if (!data) notFound();
  const { order: o, payments, audit } = data;
  const tax = o.pricing.cgstP + o.pricing.sgstP + o.pricing.igstP;

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-4" /> Orders</Link>
      <PageHeader
        title={`Order ${o._id}`}
        description={`Placed ${adminDate.format(new Date(o.createdAt))} by ${o.contact.name}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
            <Badge tone={STATUS_TONE[o.payment.status]}>{o.payment.method === "cod" ? "COD" : "Online"} · {PAYMENT_LABEL[o.payment.status]}</Badge>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-6">
          <Card title="Items" actions={<Link href={routes.packingSlip(o._id)} className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"><Printer className="size-4" /> Packing slip</Link>}>
            <ul className="divide-y divide-neutral-100">
              {o.items.map((i) => (
                <li key={i.sku} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div><p className="font-medium">{i.name} · {i.variantLabel}</p><p className="text-xs text-neutral-500">{i.sku} · HSN {i.hsnCode}</p></div>
                  <p className="tabular-nums">{i.qty} × {formatPrice(i.unitPriceP)}</p>
                  <p className="w-24 text-right font-medium tabular-nums">{formatPrice(i.lineTotalP - i.discountP)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-t border-neutral-200 pt-4 text-sm">
              <dt className="text-neutral-600">Subtotal</dt><dd className="text-right tabular-nums">{formatPrice(o.pricing.subtotalP)}</dd>
              {o.pricing.discountP > 0 && (<><dt className="text-neutral-600">Discount {o.pricing.couponCode && `(${o.pricing.couponCode})`}</dt><dd className="text-right tabular-nums">− {formatPrice(o.pricing.discountP)}</dd></>)}
              <dt className="text-neutral-600">Shipping</dt><dd className="text-right tabular-nums">{formatPrice(o.pricing.shippingP)}</dd>
              {o.pricing.giftWrapP > 0 && (<><dt className="text-neutral-600">Gift wrap</dt><dd className="text-right tabular-nums">{formatPrice(o.pricing.giftWrapP)}</dd></>)}
              {o.pricing.codFeeP > 0 && (<><dt className="text-neutral-600">COD fee</dt><dd className="text-right tabular-nums">{formatPrice(o.pricing.codFeeP)}</dd></>)}
              <dt className="font-semibold">Total</dt><dd className="text-right font-semibold tabular-nums">{formatPrice(o.pricing.totalP)}</dd>
              <dt className="text-xs text-neutral-500">GST included ({o.placeOfSupply.isInterState ? "IGST" : "CGST + SGST"})</dt><dd className="text-right text-xs tabular-nums text-neutral-500">{formatPrice(tax)}</dd>
              {o.payment.refundedP > 0 && (<><dt className="text-red-700">Refunded</dt><dd className="text-right tabular-nums text-red-700">{formatPrice(o.payment.refundedP)}</dd></>)}
            </dl>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card title="Customer">
              <p className="font-medium">{o.contact.name}</p>
              <p className="text-sm text-neutral-600">{o.contact.email}</p>
              <p className="text-sm text-neutral-600">{o.contact.phone}</p>
              <p className="mt-2 text-xs text-neutral-500">{o.userId ? "Signed-in customer" : "Guest checkout"}</p>
            </Card>
            <Card title="Ship to">
              <address className="text-sm not-italic leading-relaxed">
                <span className="font-medium">{o.shippingAddress.fullName}</span> · {o.shippingAddress.phone}<br />
                {o.shippingAddress.line1}{o.shippingAddress.line2 && `, ${o.shippingAddress.line2}`}<br />
                {o.shippingAddress.landmark && <>{o.shippingAddress.landmark}<br /></>}
                {o.shippingAddress.city}, {o.shippingAddress.state} <b>{o.shippingAddress.pincode}</b>
              </address>
              {o.gift.wrap && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Gift wrap{o.gift.hidePrice ? " · hide prices in parcel" : ""}{o.gift.message && <>: “{o.gift.message}”</>}</p>}
            </Card>
          </div>

          <Card title="Timeline">
            <ol className="flex flex-col gap-3 text-sm">
              {[...o.history].reverse().map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-neutral-400" aria-hidden />
                  <div><p>{h.note ?? h.status} {!h.visibleToCustomer && <Badge>internal</Badge>}</p><p className="text-xs text-neutral-500">{adminDate.format(new Date(h.at))} · {h.actor.name}</p></div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Actions">
            {o.status === "delivered" || o.status === "cancelled" || o.status === "returned" ? (
              <p className="text-sm text-neutral-600">This order is {STATUS_LABEL[o.status].toLowerCase()}. No further steps.</p>
            ) : (
              <OrderAdminActions orderId={o._id} status={o.status} canCancel={hasRole(user, "admin")} paidOnline={o.payment.method === "razorpay" && o.payment.status === "paid"} />
            )}
          </Card>
          {o.shipment?.awb && (
            <Card title="Shipment">
              <p className="text-sm">{o.shipment.courier} · <span className="font-mono">{o.shipment.awb}</span></p>
              {o.shipment.trackingUrl && <a href={o.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm underline">Track <ExternalLink className="size-3.5" /></a>}
            </Card>
          )}
          <Card title="Payment">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-neutral-600">Method</dt><dd>{o.payment.method === "cod" ? "Cash on delivery" : "Razorpay"}</dd>
              {o.payment.razorpayPaymentId && (<><dt className="text-neutral-600">Payment ID</dt><dd className="truncate font-mono text-xs">{o.payment.razorpayPaymentId}</dd></>)}
              {o.invoice?.number && (<><dt className="text-neutral-600">Invoice</dt><dd><Link href={routes.invoice(o._id)} className="underline">{o.invoice.number}</Link></dd></>)}
            </dl>
            {payments.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                {payments.map((p, i) => <li key={i}>{p.kind} · {formatPrice(p.amountP)} · {p.status} · via {p.source}</li>)}
              </ul>
            )}
          </Card>
          <Card title="Internal notes">
            {o.notesInternal && <pre className="mb-3 whitespace-pre-wrap font-sans text-sm text-neutral-700">{o.notesInternal}</pre>}
            <OrderNoteForm orderId={o._id} />
          </Card>
          {audit.length > 0 && (
            <Card title="Audit">
              <ul className="flex flex-col gap-1 text-xs text-neutral-600">{audit.map((a, i) => <li key={i}>{a.action} · {a.actor.name} · {a.createdAt ? adminDate.format(new Date(a.createdAt)) : ""}</li>)}</ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
