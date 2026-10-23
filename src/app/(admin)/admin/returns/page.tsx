import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { listReturnsAdmin, RETURN_TABS, type ReturnTab } from "@/server/admin/ops";
import { RETURN_REASONS } from "@/server/models/engagement";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/money";
import { adminDate } from "@/components/admin/format";
import { AdminSkeleton, Badge, btnSecondary, Empty, inputCls, PageHeader, Table, STATUS_TONE, td, th } from "@/components/admin/ui";

export const metadata = { title: "Returns & claims" };

export default function Page(props: PageProps<"/admin/returns">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminReturns {...props} />
    </Suspense>
  );
}

async function AdminReturns({ searchParams }: PageProps<"/admin/returns">) {
  const user = await adminUser();
  if (!user) return null;
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" && sp.tab in RETURN_TABS ? sp.tab : "open") as ReturnTab;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const rows = await listReturnsAdmin(tab, q);
  return (
    <>
      <PageHeader title="Returns & claims" description="Damaged, leaked or wrong items reported by customers, with their photos and video." />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <nav aria-label="Status" className="flex flex-wrap gap-1">
          {(Object.keys(RETURN_TABS) as ReturnTab[]).map((k) => (
            <Link key={k} href={`/admin/returns?tab=${k}` as Route} aria-current={tab === k ? "page" : undefined} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", tab === k ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200/70")}>{RETURN_TABS[k].label}</Link>
          ))}
        </nav>
        <form action="/admin/returns" className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <label className="relative"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" /><input name="q" defaultValue={q} placeholder="RT-, order or email" className={`${inputCls} w-64 pl-9`} /></label>
          <button className={btnSecondary}>Search</button>
        </form>
      </div>
      {rows.length === 0 ? (
        <Empty title="No requests here">When a customer reports a problem from their order page, it appears in Open.</Empty>
      ) : (
        <Table>
          <thead><tr><th className={th}>Request</th><th className={th}>Customer</th><th className={th}>Reason</th><th className={th}>Items</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-neutral-50">
                <td className={td}><Link href={routes.adminReturn(r._id)} className="font-medium underline-offset-4 hover:underline">{r._id}</Link><span className="block text-xs text-neutral-500">{r.orderId} · {adminDate.format(r.createdAt)}</span></td>
                <td className={td}>{r.name}<span className="block text-xs text-neutral-500">{r.email}</span></td>
                <td className={td}>{RETURN_REASONS[r.reason]}{r.evidence.length ? <span className="block text-xs text-neutral-500">{r.evidence.length} attachment{r.evidence.length === 1 ? "" : "s"}</span> : null}</td>
                <td className={td}>{r.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}<span className="block text-xs text-neutral-500">{formatPrice(r.items.reduce((n, i) => n + i.unitPriceP * i.qty, 0))}</span></td>
                <td className={td}><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
