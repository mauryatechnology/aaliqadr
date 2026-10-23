import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { listInvoices, OPS_PAGE } from "@/server/admin/ops";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { adminDay } from "@/components/admin/format";
import { AdminSkeleton, Badge, btnSecondary, Empty, inputCls, PageHeader, STATUS_TONE, Table, td, th } from "@/components/admin/ui";
import { CsvButton } from "@/components/admin/ops/CsvButton";

export const metadata = { title: "Invoices" };

export default function Page(props: PageProps<"/admin/invoices">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminInvoices {...props} />
    </Suspense>
  );
}

async function AdminInvoices({ searchParams }: PageProps<"/admin/invoices">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can see invoices.</p>;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const fyParam = typeof sp.fy === "string" && /^\d{4}-\d{2}$/.test(sp.fy) ? sp.fy : "";
  const { rows, total, years, current } = await listInvoices(q, fyParam, page);
  const fy = fyParam || current;
  return (
    <>
      <PageHeader title="Invoices" description="Tax invoices are numbered consecutively per financial year when an order is confirmed." actions={<CsvButton label={`Register ${fy}`} file={`aaliqadr-invoices-${fy}.csv`} invoicesFy={fy} />} />
      <form action="/admin/invoices" className="mb-4 flex flex-wrap gap-2">
        <label className="relative"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" /><input name="q" defaultValue={q} placeholder="Invoice no., order, name or email" className={`${inputCls} w-72 pl-9`} /></label>
        <select name="fy" defaultValue={fyParam} aria-label="Financial year" className={`${inputCls} w-40`}>
          <option value="">All years</option>
          {[...new Set([current, ...years])].map((y) => <option key={y} value={y}>FY {y}</option>)}
        </select>
        <button className={btnSecondary}>Apply</button>
      </form>
      {rows.length === 0 ? (
        <Empty title="No invoices yet">Invoices appear here once orders are confirmed.</Empty>
      ) : (
        <Table>
          <thead><tr><th className={th}>Invoice</th><th className={th}>Customer</th><th className={th}>Supply</th><th className={`${th} text-right`}>Taxable</th><th className={`${th} text-right`}>GST</th><th className={`${th} text-right`}>Total</th><th className={th}>Order</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o._id} className="hover:bg-neutral-50">
                <td className={td}><a href={routes.invoice(o._id)} target="_blank" rel="noreferrer" className="font-mono font-medium underline-offset-4 hover:underline">{o.invoice?.number}</a><span className="block text-xs text-neutral-500">{o.invoice?.issuedAt ? adminDay.format(o.invoice.issuedAt) : ""}</span></td>
                <td className={td}>{o.contact.name}<span className="block text-xs text-neutral-500">{o.contact.email}</span></td>
                <td className={td}>{o.shippingAddress?.state}<span className="block text-xs text-neutral-500">{o.placeOfSupply?.isInterState ? "IGST" : "CGST + SGST"}</span></td>
                <td className={`${td} text-right tabular-nums`}>{formatPrice(o.pricing.taxableP)}</td>
                <td className={`${td} text-right tabular-nums`}>{formatPrice(o.pricing.cgstP + o.pricing.sgstP + o.pricing.igstP)}</td>
                <td className={`${td} text-right tabular-nums`}>{formatPrice(o.pricing.totalP)}</td>
                <td className={td}><Link href={routes.adminOrder(o._id)} className="underline-offset-4 hover:underline">{o._id}</Link><span className="mt-0.5 block"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></span></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {total > page * OPS_PAGE && <Link className={`${btnSecondary} mt-4`} href={`/admin/invoices?q=${encodeURIComponent(q)}&fy=${fyParam}&page=${page + 1}` as Route}>Next page</Link>}
    </>
  );
}
