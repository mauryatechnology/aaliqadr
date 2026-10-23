import Link from "next/link";
import { Suspense } from "react";
import type { Route } from "next";
import { Search } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { adminUser } from "@/server/admin/guard";
import { listOrders, ORDER_TABS, PAGE_SIZE, type OrderTab } from "@/server/admin/queries";
import { AdminSkeleton, Badge, btnSecondary, Empty, inputCls, PageHeader, STATUS_TONE, Table, td, th } from "@/components/admin/ui";
import { adminDate } from "@/components/admin/format";

export const metadata = { title: "Orders" };

export default function Page(props: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminOrders {...props} />
    </Suspense>
  );
}

async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const user = await adminUser();
  if (!user) return null;
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" && sp.tab in ORDER_TABS ? sp.tab : "all") as OrderTab;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);
  const { rows, total, tabCounts } = await listOrders(tab, q, page);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { tab, q, page: 1, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === 1) && !(k === "tab" && v === "all")) params.set(k, String(v));
    const s = params.toString();
    return (`/admin/orders${s ? `?${s}` : ""}`) as Route;
  };

  return (
    <>
      <PageHeader title="Orders" description="Pack and ship confirmed orders. Search by order number, email, phone or name." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(ORDER_TABS) as OrderTab[]).map((t) => (
          <Link key={t} href={href({ tab: t, page: 1 })} aria-current={t === tab ? "page" : undefined} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", t === tab ? "bg-neutral-900 text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50")}>
            {ORDER_TABS[t].label} <span className={cn("ml-1 tabular-nums", t === tab ? "text-neutral-300" : "text-neutral-500")}>{tabCounts[t]}</span>
          </Link>
        ))}
        <form action="/admin/orders" className="ml-auto flex w-full gap-2 sm:w-auto" role="search">
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <label htmlFor="q" className="sr-only">Search orders</label>
          <input id="q" name="q" defaultValue={q} placeholder="AQ-100001, email, phone…" className={`${inputCls} sm:w-72`} />
          <button className={btnSecondary} type="submit" aria-label="Search"><Search className="size-4" /></button>
        </form>
      </div>
      {rows.length === 0 ? (
        <Empty title={q ? `No orders match “${q}”` : "No orders here yet"} />
      ) : (
        <Table>
          <thead>
            <tr><th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Items</th><th className={th}>Payment</th><th className={th}>Status</th><th className={`${th} text-right`}>Total</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o._id} className="hover:bg-neutral-50">
                <td className={td}><Link href={routes.adminOrder(o._id)} className="font-medium underline-offset-4 hover:underline">{o._id}</Link><span className="block text-xs text-neutral-500">{adminDate.format(new Date(o.createdAt))}</span></td>
                <td className={td}>{o.contact.name}<span className="block text-xs text-neutral-500">{o.contact.phone}</span></td>
                <td className={`${td} tabular-nums`}>{o.items.reduce((n, i) => n + i.qty, 0)}</td>
                <td className={td}><Badge tone={STATUS_TONE[o.payment.status]}>{o.payment.method === "cod" ? "COD" : "Online"} · {PAYMENT_LABEL[o.payment.status]}</Badge></td>
                <td className={td}><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>{o.shipment?.awb && <span className="block text-xs text-neutral-500">AWB {o.shipment.awb}</span>}</td>
                <td className={`${td} text-right tabular-nums`}>{formatPrice(o.pricing.totalP)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-neutral-600">Page {page} of {pages} · {total} orders</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: page - 1 })} className={btnSecondary}>Previous</Link>}
            {page < pages && <Link href={href({ page: page + 1 })} className={btnSecondary}>Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
