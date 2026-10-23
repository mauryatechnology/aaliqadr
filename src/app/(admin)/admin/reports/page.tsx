import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { salesReport } from "@/server/admin/ops";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdminSkeleton, btnSecondary, Card, Empty, inputCls, PageHeader, Stat, Table, td, th } from "@/components/admin/ui";
import { CsvButton } from "@/components/admin/ops/CsvButton";
import { DailyBars } from "@/components/admin/ops/DailyBars";

export const metadata = { title: "Reports & GST" };

export default function Page(props: PageProps<"/admin/reports">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminReports {...props} />
    </Suspense>
  );
}

/** IST calendar date → the UTC instant of its midnight. */
const istMidnight = (ymd: string) => new Date(`${ymd}T00:00:00+05:30`);
const ymd = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

function presets(now: Date) {
  const today = ymd(now);
  const [y, m] = today.split("-").map(Number) as [number, number];
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const prevStart = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
  const fyStart = m >= 4 ? `${y}-04-01` : `${y - 1}-04-01`;
  const tomorrow = ymd(new Date(istMidnight(today).getTime() + 86_400_000));
  return {
    month: { label: "This month", from: monthStart, to: tomorrow },
    last: { label: "Last month", from: prevStart, to: monthStart },
    d30: { label: "Last 30 days", from: ymd(new Date(istMidnight(today).getTime() - 29 * 86_400_000)), to: tomorrow },
    fy: { label: "Financial year to date", from: fyStart, to: tomorrow },
  };
}

async function AdminReports({ searchParams }: PageProps<"/admin/reports">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can see reports.</p>;
  const sp = await searchParams;
  const p = presets(new Date());
  const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const preset = typeof sp.range === "string" && sp.range in p ? (sp.range as keyof typeof p) : isDate(sp.from) && isDate(sp.to) ? null : "month";
  const from = preset ? p[preset].from : (sp.from as string);
  const to = preset ? p[preset].to : ymd(new Date(istMidnight(sp.to as string).getTime() + 86_400_000));
  const r = await salesReport(istMidnight(from), istMidnight(to));
  const t = r.totals;
  const tax = t.cgstP + t.sgstP + t.igstP;
  const file = (k: string) => `aaliqadr-${k}-${from}-to-${to}.csv`;
  const range = { from: istMidnight(from).toISOString(), to: istMidnight(to).toISOString() };

  // Every day in the range, zero-filled, so gaps read as gaps.
  const byDay = new Map(r.daily.map((d) => [d._id, d]));
  const days: { date: string; grossP: number; orders: number }[] = [];
  for (let d = istMidnight(from); d < istMidnight(to) && days.length < 400; d = new Date(d.getTime() + 86_400_000)) {
    const k = ymd(d);
    days.push({ date: k, grossP: byDay.get(k)?.grossP ?? 0, orders: byDay.get(k)?.orders ?? 0 });
  }

  return (
    <>
      <PageHeader title="Reports & GST" description="Sales by invoice date (confirmed orders). Amounts include GST unless marked taxable." />
      <div className="mb-6 flex flex-wrap items-end gap-2">
        {Object.entries(p).map(([k, v]) => (
          <Link key={k} href={`/admin/reports?range=${k}` as Route} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", preset === k ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200/70")}>{v.label}</Link>
        ))}
        <form action="/admin/reports" className="ml-auto flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-neutral-600">From<input type="date" name="from" defaultValue={from} className={`${inputCls} w-40`} /></label>
          <label className="flex flex-col gap-1 text-xs text-neutral-600">To<input type="date" name="to" defaultValue={ymd(new Date(istMidnight(to).getTime() - 86_400_000))} className={`${inputCls} w-40`} /></label>
          <button className={btnSecondary}>Show</button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Stat label="Sales (incl. GST)" value={formatPrice(t.grossP)} hint={`${t.orders} invoices · ${t.units} units`} />
        <Stat label="Average order" value={t.orders ? formatPrice(Math.round(t.grossP / t.orders)) : "—"} />
        <Stat label="Taxable value" value={formatPrice(t.taxableP)} />
        <Stat label="GST collected" value={formatPrice(tax)} hint={`CGST ${formatPrice(t.cgstP)} · SGST ${formatPrice(t.sgstP)} · IGST ${formatPrice(t.igstP)}`} />
        <Stat label="Refunds" value={formatPrice(r.refunds.amountP)} hint={`${r.refunds.n} refund${r.refunds.n === 1 ? "" : "s"} · discounts ${formatPrice(t.discountP)}`} />
      </div>

      {t.orders === 0 ? (
        <Empty title="No sales in this period">Choose another range.</Empty>
      ) : (
        <div className="flex flex-col gap-6">
          <Card title="Daily sales" actions={<CsvButton label="CSV" file={file("daily")} report={{ kind: "daily", ...range }} />}>
            <DailyBars days={days} />
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title="By product" className="[&>div:last-child]:p-0" actions={<CsvButton label="CSV" file={file("products")} report={{ kind: "products", ...range }} />}>
              <Table compact className="rounded-none border-0 shadow-none">
                <thead><tr><th className={th}>Product</th><th className={`${th} text-right`}>Units</th><th className={`${th} text-right`}>Sales</th></tr></thead>
                <tbody>{r.byProduct.slice(0, 15).map((x) => <tr key={x.sku}><td className={td}>{x.name}<span className="block text-xs text-neutral-500">{x.label} · {x.sku}</span></td><td className={`${td} text-right tabular-nums`}>{x.qty}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(x.netP)}</td></tr>)}</tbody>
              </Table>
            </Card>
            <Card title="By category" className="[&>div:last-child]:p-0">
              <Table compact className="rounded-none border-0 shadow-none">
                <thead><tr><th className={th}>Category</th><th className={`${th} text-right`}>Units</th><th className={`${th} text-right`}>Sales</th></tr></thead>
                <tbody>{r.byCategory.map((x) => <tr key={x.name}><td className={td}>{x.name}</td><td className={`${td} text-right tabular-nums`}>{x.qty}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(x.netP)}</td></tr>)}</tbody>
              </Table>
            </Card>
          </div>

          <Card title="GST: HSN summary (GSTR-1 table 12)" className="[&>div:last-child]:p-0" actions={<CsvButton label="CSV" file={file("hsn-summary")} report={{ kind: "hsn", ...range }} />}>
            <Table className="rounded-none border-0 shadow-none">
              <thead><tr><th className={th}>HSN</th><th className={th}>Rate</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Value</th><th className={`${th} text-right`}>Taxable</th><th className={`${th} text-right`}>IGST</th><th className={`${th} text-right`}>CGST</th><th className={`${th} text-right`}>SGST</th></tr></thead>
              <tbody>{r.hsn.map((h) => <tr key={`${h.hsn}-${h.ratePercent}`}><td className={`${td} font-mono`}>{h.hsn}</td><td className={td}>{h.ratePercent}%</td><td className={`${td} text-right tabular-nums`}>{h.qty}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(h.valueP)}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(h.taxableP)}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(h.igstP)}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(h.cgstP)}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(h.sgstP)}</td></tr>)}</tbody>
            </Table>
            <p className="px-5 py-3 text-xs text-neutral-500">Goods lines only; shipping, COD and gift-wrap charges are on each invoice. Share with your CA for filing.</p>
          </Card>

          <Card title="By place of supply (B2C)" className="[&>div:last-child]:p-0" actions={<CsvButton label="CSV" file={file("place-of-supply")} report={{ kind: "states", ...range }} />}>
            <Table className="rounded-none border-0 shadow-none">
              <thead><tr><th className={th}>State</th><th className={`${th} text-right`}>Invoices</th><th className={`${th} text-right`}>Value</th><th className={`${th} text-right`}>Taxable</th><th className={`${th} text-right`}>GST</th></tr></thead>
              <tbody>{r.byState.map((s) => <tr key={s.state}><td className={td}>{s.state}</td><td className={`${td} text-right tabular-nums`}>{s.orders}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(s.grossP)}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(s.taxableP)}</td><td className={`${td} text-right tabular-nums`}>{formatPrice(s.cgstP + s.sgstP + s.igstP)}</td></tr>)}</tbody>
            </Table>
          </Card>

          <details className="rounded-xl border border-neutral-200 bg-white p-5 text-sm">
            <summary className="cursor-pointer font-medium">Daily figures as a table</summary>
            <table className="mt-3 w-full text-left"><thead><tr className="text-xs uppercase text-neutral-500"><th className="py-1">Date</th><th className="py-1 text-right">Orders</th><th className="py-1 text-right">Sales</th></tr></thead>
              <tbody>{days.filter((d) => d.orders).map((d) => <tr key={d.date} className="border-t border-neutral-100"><td className="py-1">{d.date}</td><td className="py-1 text-right">{d.orders}</td><td className="py-1 text-right">{formatPrice(d.grossP)}</td></tr>)}</tbody>
            </table>
          </details>
        </div>
      )}
    </>
  );
}
