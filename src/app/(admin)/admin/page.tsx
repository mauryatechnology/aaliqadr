import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ZODIAC } from "@/config/zodiac";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/cn";
import { adminUser } from "@/server/admin/guard";
import { getDashboard2 } from "@/server/admin/queries";
import { AdminSkeleton, Badge, Card, Empty, PageHeader, STATUS_TONE } from "@/components/admin/ui";
import { DailyBars } from "@/components/admin/ops/DailyBars";
import { RelativeTime } from "@/components/admin/kit/Bits";

/** Dashboard 2.0 (plan.md §4): date range, KPI strip with change, action queues, trend, top sellers. */

const DAY = 86_400_000;
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
const istMidnight = (s: string) => new Date(`${s}T00:00:00+05:30`);

function ranges(now: Date) {
  const today = ymd(now);
  const tomorrow = ymd(new Date(istMidnight(today).getTime() + DAY));
  const [y, m] = today.split("-").map(Number) as [number, number];
  const fyStart = `${m >= 4 ? y : y - 1}-04-01`;
  return {
    today: { label: "Today", from: today, to: tomorrow },
    d7: { label: "7 days", from: ymd(new Date(istMidnight(today).getTime() - 6 * DAY)), to: tomorrow },
    d30: { label: "30 days", from: ymd(new Date(istMidnight(today).getTime() - 29 * DAY)), to: tomorrow },
    fy: { label: "Financial year", from: fyStart, to: tomorrow },
  };
}

export default function Page(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminDashboard {...props} />
    </Suspense>
  );
}

async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const user = await adminUser();
  if (!user) return null;
  const sp = await searchParams;
  const p = ranges(new Date());
  const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const key = typeof sp.range === "string" && sp.range in p ? (sp.range as keyof typeof p) : isDate(sp.from) && isDate(sp.to) ? null : "d30";
  const from = key ? p[key].from : (sp.from as string);
  const toIncl = key ? ymd(new Date(istMidnight(p[key].to).getTime() - DAY)) : (sp.to as string);
  const to = ymd(new Date(istMidnight(toIncl).getTime() + DAY));
  const d = await getDashboard2(istMidnight(from), istMidnight(to));
  const showMoney = user.role !== "staff";
  const maxSign = Math.max(1, ...d.bySign.map((s) => s.revenueP));
  const byDay = new Map(d.daily.map((x) => [x._id, x]));
  const days: { date: string; grossP: number; orders: number }[] = [];
  for (let t = istMidnight(from).getTime(); t < istMidnight(to).getTime() && days.length < 400; t += DAY) {
    const k = ymd(new Date(t));
    days.push({ date: k, grossP: byDay.get(k)?.grossP ?? 0, orders: byDay.get(k)?.orders ?? 0 });
  }

  const queues: { label: string; n: number; href: string; tone?: "amber" | "red" }[] = [
    { label: "To pack", n: d.queues.toPack, href: "/admin/orders?status=confirmed" },
    { label: "To ship", n: d.queues.toShip, href: "/admin/orders?status=processing" },
    { label: "Awaiting payment", n: d.queues.awaitingPayment, href: "/admin/orders?status=pending_payment" },
    { label: "Open claims", n: d.queues.claims, href: "/admin/returns", tone: "amber" },
    { label: "Reviews waiting", n: d.queues.reviews, href: "/admin/reviews" },
    { label: "Low stock", n: d.queues.lowStock, href: "/admin/inventory?stock=low", tone: "red" },
  ];

  return (
    <>
      <PageHeader title={`Good to see you, ${user.name.split(" ")[0]}`} description="Revenue counts confirmed orders (prepaid or COD), not cancellations. Changes compare with the previous period of the same length." />

      <form action="/admin" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
        {(Object.keys(p) as (keyof typeof p)[]).map((k) => (
          <Link key={k} href={`/admin?range=${k}` as Route} aria-current={key === k ? "true" : undefined} className={cn("rounded-full px-3 py-1", key === k ? "bg-neutral-900 text-white" : "bg-white ring-1 ring-neutral-200 hover:bg-neutral-50")}>{p[k].label}</Link>
        ))}
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-neutral-600">
          <input type="date" name="from" defaultValue={from} className="h-8 rounded-lg border border-neutral-300 px-2" aria-label="From" />–
          <input type="date" name="to" defaultValue={toIncl} className="h-8 rounded-lg border border-neutral-300 px-2" aria-label="To" />
          <button type="submit" className="h-8 rounded-lg border border-neutral-300 bg-white px-3">Apply</button>
        </span>
      </form>

      {showMoney && (
        <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 md:grid-cols-5">
          <Kpi label="Revenue" value={formatPrice(d.now.revenueP)} now={d.now.revenueP} prev={d.prev.revenueP} />
          <Kpi label="Orders" value={String(d.now.orders)} now={d.now.orders} prev={d.prev.orders} />
          <Kpi label="Average order" value={d.now.aovP ? formatPrice(d.now.aovP) : "—"} now={d.now.aovP} prev={d.prev.aovP} />
          <Kpi label="Refunds" value={formatPrice(d.now.refundsP)} now={d.now.refundsP} prev={d.prev.refundsP} invert />
          <Kpi label="COD share" value={`${Math.round(d.now.codShare * 100)}%`} now={d.now.codShare} prev={d.prev.codShare} invert />
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {queues.map((q) => (
          <Link key={q.label} href={q.href as Route} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 shadow-sm hover:border-neutral-400">
            <p className="text-xs text-neutral-600">{q.label}</p>
            <p className={cn("text-xl font-semibold tabular-nums", q.n > 0 && q.tone === "red" && "text-red-700", q.n > 0 && q.tone === "amber" && "text-amber-700")}>{q.n}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {showMoney && (
            <Card title="Revenue by day">
              {d.now.orders === 0 ? <p className="text-sm text-neutral-600">No confirmed orders in this period.</p> : <DailyBars days={days} />}
            </Card>
          )}
          <Card title="Recent orders" actions={<Link href="/admin/orders" className="text-sm font-medium text-neutral-700 hover:underline">View all</Link>}>
            {d.recent.length === 0 ? (
              <Empty title="No orders yet">They appear here the moment a customer checks out.</Empty>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
                {d.recent.map((o) => (
                  <li key={o._id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0"><Link href={routes.adminOrder(o._id)} className="font-medium hover:underline">{o._id}</Link><span className="ml-2 text-neutral-600">{o.contact.name}</span><span className="block text-xs text-neutral-500"><RelativeTime date={o.createdAt} /></span></span>
                    <span className="flex shrink-0 items-center gap-2"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>{showMoney && <span className="w-20 text-right tabular-nums">{formatPrice(o.pricing.totalP)}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {showMoney && (
            <Card title="Top products">
              {d.top.length === 0 ? <p className="text-sm text-neutral-600">No sales in this period.</p> : (
                <ol className="flex flex-col gap-2 text-sm">
                  {d.top.map((t, i) => (
                    <li key={t._id.productId} className="flex justify-between gap-3"><span><span className="mr-2 text-neutral-400">{i + 1}</span>{t._id.name}</span><span className="tabular-nums text-neutral-600">{formatPrice(t.netP)} · {t.qty}</span></li>
                  ))}
                </ol>
              )}
            </Card>
          )}
          <Card title="Low stock" actions={<Link href="/admin/inventory?stock=low" className="text-sm font-medium text-neutral-700 hover:underline">Inventory</Link>}>
            {d.lowStock.length === 0 ? <p className="text-sm text-neutral-600">Every active size is above its threshold.</p> : (
              <ul className="flex flex-col gap-2 text-sm">
                {d.lowStock.map((v) => (
                  <li key={v.sku} className="flex items-center justify-between gap-3"><span>{v.name} <span className="text-neutral-500">· {v.label}</span></span><Badge tone={v.stock <= 0 ? "red" : "amber"}>{v.stock <= 0 ? "Sold out" : `${v.stock} left`}</Badge></li>
                ))}
              </ul>
            )}
          </Card>
          {showMoney && d.bySign.length > 0 && (
            <Card title="Sales by sign">
              <ul className="flex flex-col gap-3 text-sm">
                {d.bySign.map((s) => {
                  const sign = s._id ? ZODIAC[s._id] : undefined;
                  return (
                    <li key={s._id ?? "bundle"}>
                      <div className="flex justify-between gap-3"><span>{sign ? sign.name : "Bundles & gift sets"}</span><span className="tabular-nums text-neutral-600">{formatPrice(s.revenueP)} · {s.qty}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-700" style={{ width: `${(s.revenueP / maxSign) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, now, prev, invert = false }: { label: string; value: string; now: number; prev: number; invert?: boolean }) {
  const change = prev > 0 ? (now - prev) / prev : now > 0 ? 1 : 0;
  const good = invert ? change < 0 : change > 0;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-xs text-neutral-600">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {change !== 0 && (
        <p className={cn("inline-flex items-center gap-0.5 text-xs tabular-nums", good ? "text-emerald-700" : "text-red-700")}>
          <Icon className="size-3.5" aria-hidden /> {Math.abs(Math.round(change * 100))}% <span className="text-neutral-500">vs previous</span>
        </p>
      )}
    </div>
  );
}
