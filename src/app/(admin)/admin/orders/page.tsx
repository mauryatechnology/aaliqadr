import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/money";
import { PAYMENT_LABEL, PAYMENT_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import { parseList } from "@/lib/list-params";
import { routes } from "@/lib/routes";
import { INDIAN_STATES } from "@/config/india";
import { SIGNS } from "@/config/zodiac";
import { adminUser } from "@/server/admin/guard";
import { listOrdersPaged } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { AdminSkeleton, Badge, Empty, PageHeader, STATUS_TONE } from "@/components/admin/ui";
import { DataTable, ListTabs, type Column } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { CopyButton, RelativeTime } from "@/components/admin/kit/Bits";
import { OrderBulkBar } from "@/components/admin/OrderBulkBar";

export const metadata = { title: "Orders" };

const spec = LIST_SPECS.orders;
const BASE = "/admin/orders";

const TABS = [
  { value: "", label: "All" },
  { value: "confirmed,processing", label: "To ship" },
  { value: "pending_payment", label: "Awaiting payment" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled,returned", label: "Cancelled" },
];

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
  const state = parseList(await searchParams, spec);
  const { rows, total, statusCounts } = await listOrdersPaged(state);
  type Row = (typeof rows)[number];
  const count = (v: string) => (v ? v.split(",").reduce((n, s) => n + (statusCounts[s] ?? 0), 0) : Object.values(statusCounts).reduce((a, b) => a + b, 0));
  const filtered = !!(state.q || Object.keys(state.f).some((k) => k !== "status"));

  const columns: Column<Row>[] = [
    {
      key: "order",
      label: "Order",
      sort: "date",
      cell: (o) => (
        <span className="flex flex-col">
          <span className="inline-flex items-center gap-1">
            <Link href={routes.adminOrder(o._id)} className="font-medium underline-offset-4 hover:underline">{o._id}</Link>
            <CopyButton value={o._id} label="Copy order number" />
          </span>
          <span className="text-xs text-neutral-500"><RelativeTime date={o.createdAt} /></span>
        </span>
      ),
    },
    { key: "customer", label: "Customer", cell: (o) => <span className="flex flex-col"><span className="max-w-48 truncate" title={o.contact.name}>{o.contact.name}</span><span className="text-xs text-neutral-500">{o.contact.phone} · {o.shippingAddress?.city}</span></span> },
    { key: "items", label: "Items", cell: (o) => <span className="block max-w-56 truncate text-xs" title={o.items.map((i) => `${i.qty}× ${i.name} ${i.variantLabel}`).join(", ")}>{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span> },
    { key: "payment", label: "Payment", cell: (o) => <Badge tone={STATUS_TONE[o.payment.status]}>{o.payment.method === "cod" ? "COD" : "Online"} · {PAYMENT_LABEL[o.payment.status]}</Badge> },
    { key: "status", label: "Status", sort: "status", cell: (o) => <span className="flex flex-col items-start gap-0.5"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>{o.shipment?.awb && <span className="text-xs text-neutral-500">AWB {o.shipment.awb}</span>}</span> },
    { key: "total", label: "Total", sort: "total", align: "right", cell: (o) => formatPrice(o.pricing.totalP) },
  ];

  return (
    <>
      <PageHeader title="Orders" description="Pack and ship confirmed orders." />
      <ListTabs base={BASE} spec={spec} state={state} filter="status" tabs={TABS.map((t) => ({ ...t, count: count(t.value) }))} />
      <ListToolbar
        placeholder="Order no., email, phone, name, AWB, invoice"
        exportKind="orders"
        sorts={[{ value: "date", label: "Date" }, { value: "total", label: "Total" }]}
        filters={[
          { key: "pay", label: "Method", options: [{ value: "cod", label: "COD" }, { value: "razorpay", label: "Online" }] },
          { key: "paid", label: "Payment", type: "multi", options: PAYMENT_STATUSES.map((p) => ({ value: p, label: PAYMENT_LABEL[p] })) },
          { key: "state", label: "State", type: "multi", options: INDIAN_STATES.map((s) => ({ value: s.code, label: s.name })) },
          { key: "sign", label: "Sign", type: "multi", options: SIGNS.map((s) => ({ value: s.slug, label: s.name })) },
          { key: "coupon", label: "Coupon", options: [{ value: "yes", label: "Used a coupon" }, { value: "no", label: "No coupon" }] },
          { key: "from", label: "From", type: "date" },
          { key: "to", label: "To", type: "date" },
        ]}
      />
      <OrderBulkBar ids={rows.map((o) => ({ id: o._id, status: o.status }))} />
      <DataTable
        base={BASE}
        spec={spec}
        state={state}
        total={total}
        rows={rows}
        columns={columns}
        rowKey={(o) => o._id}
        select={{ form: "bulk-orders", value: (o) => o._id }}
        mobile={(o) => (
          <Link href={routes.adminOrder(o._id)} className="flex flex-col gap-1">
            <span className="flex items-center justify-between gap-2"><span className="font-medium">{o._id}</span><span className="tabular-nums">{formatPrice(o.pricing.totalP)}</span></span>
            <span className="text-neutral-600">{o.contact.name} · {o.items.reduce((n, i) => n + i.qty, 0)} item(s)</span>
            <span className="flex flex-wrap items-center gap-1.5"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge><Badge tone={STATUS_TONE[o.payment.status]}>{o.payment.method === "cod" ? "COD" : "Online"}</Badge><span className="text-xs text-neutral-500"><RelativeTime date={o.createdAt} /></span></span>
          </Link>
        )}
        empty={<Empty title={filtered ? "No orders match" : "No orders here yet"}>{filtered ? "Try a different search or clear the filters." : "New orders appear here as soon as they're placed."}</Empty>}
      />
    </>
  );
}
