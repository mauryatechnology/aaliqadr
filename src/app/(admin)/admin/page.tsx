import Link from "next/link";
import { Suspense } from "react";
import { ZODIAC } from "@/config/zodiac";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { adminUser } from "@/server/admin/guard";
import { getDashboard } from "@/server/admin/queries";
import { AdminSkeleton, Badge, Card, Empty, PageHeader, Stat, STATUS_TONE, Table, td, th } from "@/components/admin/ui";
import { adminDate } from "@/components/admin/format";

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}

async function AdminDashboard() {
  const user = await adminUser();
  if (!user) return null;
  const d = await getDashboard();
  const showMoney = user.role !== "staff";
  const maxSign = Math.max(1, ...d.bySign.map((s) => s.revenueP));

  return (
    <>
      <PageHeader title={`Good to see you, ${user.name.split(" ")[0]}`} description="Today at a glance. Revenue counts confirmed orders (prepaid or COD), not cancellations." />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {showMoney && <Stat label="Revenue today" value={formatPrice(d.today.totalP)} hint={`${d.today.count} orders`} />}
        {showMoney && <Stat label="Last 7 days" value={formatPrice(d.week.totalP)} hint={`${d.week.count} orders`} />}
        {showMoney && <Stat label="Last 30 days" value={formatPrice(d.month.totalP)} hint={d.month.count ? `Avg. order ${formatPrice(Math.round(d.month.totalP / d.month.count))}` : "No orders yet"} />}
        <Stat label="To ship" value={String(d.toShip)} hint="Confirmed, not yet dispatched" href="/admin/orders?tab=to_ship" />
        {!showMoney && <Stat label="Awaiting payment" value={String(d.awaitingPayment)} href="/admin/orders?tab=pending_payment" />}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Recent orders" actions={<Link href="/admin/orders" className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline">View all</Link>} className="[&>div:last-child]:p-0">
          {d.recent.length === 0 ? (
            <div className="p-5"><Empty title="No orders yet">They appear here the moment a customer checks out.</Empty></div>
          ) : (
            <Table className="rounded-none border-0 shadow-none">
              <thead><tr><th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Status</th><th className={`${th} text-right`}>Total</th></tr></thead>
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o._id} className="hover:bg-neutral-50">
                    <td className={td}><Link href={routes.adminOrder(o._id)} className="font-medium underline-offset-4 hover:underline">{o._id}</Link><span className="block text-xs text-neutral-500">{adminDate.format(new Date(o.createdAt))}</span></td>
                    <td className={td}>{o.contact.name}</td>
                    <td className={td}><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
                    <td className={`${td} text-right tabular-nums`}>{formatPrice(o.pricing.totalP)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Low stock" actions={<Link href="/admin/inventory" className="text-sm font-medium text-neutral-700 underline-offset-4 hover:underline">Inventory</Link>}>
            {d.lowStock.length === 0 ? (
              <p className="text-sm text-neutral-600">Every active size is above its threshold.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {d.lowStock.map((v) => (
                  <li key={v.sku} className="flex items-center justify-between gap-3">
                    <span>{v.name} <span className="text-neutral-500">· {v.label}</span></span>
                    <Badge tone={v.stock === 0 ? "red" : "amber"}>{v.stock === 0 ? "Sold out" : `${v.stock} left`}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {showMoney && (
            <Card title="Sales by sign · 30 days">
              {d.bySign.length === 0 ? (
                <p className="text-sm text-neutral-600">No sales in the last 30 days.</p>
              ) : (
                <ul className="flex flex-col gap-3 text-sm">
                  {d.bySign.map((s) => {
                    const sign = s._id ? ZODIAC[s._id] : undefined;
                    return (
                      <li key={s._id ?? "bundle"}>
                        <div className="flex justify-between gap-3"><span>{sign ? `${sign.name} · ${sign.fragrance.name}` : "Bundles & gift sets"}</span><span className="tabular-nums text-neutral-600">{formatPrice(s.revenueP)} · {s.qty}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-neutral-100"><div className="h-full rounded-full" style={{ width: `${(s.revenueP / maxSign) * 100}%`, background: sign?.theme.primary ?? "#9C7A2E" }} /></div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
