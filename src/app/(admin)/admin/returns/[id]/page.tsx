import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { getReturnAdmin } from "@/server/admin/ops";
import { RETURN_REASONS } from "@/server/models/engagement";
import { nextReturnStatuses } from "@/server/services/returns";
import { formatPrice } from "@/lib/money";
import { routes } from "@/lib/routes";
import { adminDate } from "@/components/admin/format";
import { AdminSkeleton, Badge, Card, PageHeader, STATUS_TONE } from "@/components/admin/ui";
import { ReturnActions } from "@/components/admin/ops/ReturnActions";

export const metadata = { title: "Claim" };

export default function Page(props: PageProps<"/admin/returns/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminReturn {...props} />
    </Suspense>
  );
}

async function AdminReturn({ params }: PageProps<"/admin/returns/[id]">) {
  const user = await adminUser();
  if (!user) return null;
  const { id } = await params;
  const found = await getReturnAdmin(id);
  if (!found) notFound();
  const { r, order } = found;
  const claimValue = r.items.reduce((n, i) => n + i.unitPriceP * i.qty, 0);
  const remaining = order ? order.pricing.totalP - (order.payment.refundedP ?? 0) : 0;
  return (
    <>
      <Link href="/admin/returns" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"><ArrowLeft className="size-4" /> Returns & claims</Link>
      <PageHeader title={`${r._id} · ${RETURN_REASONS[r.reason]}`} description={`Raised ${adminDate.format(r.createdAt)} by ${r.name} (${r.email})`} actions={<Badge tone={STATUS_TONE[r.status]}>{r.status}{r.resolution ? ` · ${r.resolution}` : ""}</Badge>} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card title="What the customer reported">
            <p className="whitespace-pre-line text-sm text-neutral-800">{r.description}</p>
            <ul className="mt-4 flex flex-col gap-1 text-sm">
              {r.items.map((i) => <li key={i.sku}>{i.name} · {i.variantLabel} × {i.qty} <span className="text-neutral-500">({i.sku}, {formatPrice(i.unitPriceP)} each)</span></li>)}
            </ul>
          </Card>
          <Card title={`Evidence (${r.evidence.length})`}>
            {r.evidence.length === 0 ? (
              <p className="text-sm text-neutral-600">No attachments.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {r.evidence.map((e) =>
                  e.kind === "video" ? (
                    <video key={e.url} src={e.url} controls preload="metadata" className="aspect-square w-full rounded-lg bg-black object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- customer uploads open full size in a new tab
                    <a key={e.url} href={e.url} target="_blank" rel="noreferrer"><img src={e.url} alt="Customer photo" className="aspect-square w-full rounded-lg object-cover" /></a>
                  ),
                )}
              </div>
            )}
          </Card>
          <Card title="History">
            <ol className="flex flex-col gap-2 text-sm">
              {r.history.map((h, i) => (
                <li key={i} className="flex flex-col"><span><span className="font-medium">{h.status}</span> · {adminDate.format(new Date(h.at))} · {h.actor.name}{h.visibleToCustomer ? "" : " (internal)"}</span>{h.note && <span className="text-neutral-600">{h.note}</span>}</li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Next step">
            <ReturnActions id={r._id} next={nextReturnStatuses(r.status)} resolution={r.resolution} maxRefund={remaining} suggestedRefund={Math.min(claimValue, remaining) / 100} isCod={order?.payment.method === "cod"} canRefund={hasRole(user, "admin")} />
          </Card>
          {order && (
            <Card title="Order">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-neutral-500">Order</dt><dd><Link href={routes.adminOrder(order._id)} className="underline-offset-4 hover:underline">{order._id}</Link> · {order.status}</dd>
                <dt className="text-neutral-500">Total</dt><dd>{formatPrice(order.pricing.totalP)} · {order.payment.method === "cod" ? "COD" : "Online"} · {order.payment.status}</dd>
                <dt className="text-neutral-500">Refunded</dt><dd>{formatPrice(order.payment.refundedP ?? 0)}</dd>
                <dt className="text-neutral-500">Delivered</dt><dd>{order.shipment?.deliveredAt ? adminDate.format(order.shipment.deliveredAt) : "—"}</dd>
                <dt className="text-neutral-500">Ship to</dt><dd>{order.shippingAddress.fullName}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode} · {order.contact.phone}</dd>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
