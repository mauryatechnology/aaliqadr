import Link from "next/link";
import { Suspense } from "react";
import { parseList } from "@/lib/list-params";
import { routes } from "@/lib/routes";
import { formatPrice } from "@/lib/money";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { listReturnsPaged } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { RETURN_REASONS } from "@/server/models/engagement";
import { AdminSkeleton, Badge, Empty, PageHeader, STATUS_TONE } from "@/components/admin/ui";
import { DataTable, ListTabs, type Column } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { RelativeTime } from "@/components/admin/kit/Bits";
import { AdminClaimButton } from "@/components/admin/ops/AdminClaim";

export const metadata = { title: "Returns & claims" };

const spec = LIST_SPECS.returns;
const BASE = "/admin/returns";
const TABS = [
  { value: "requested,approved,received", label: "Open" },
  { value: "requested", label: "New" },
  { value: "refunded,replaced,closed", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
];

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
  const state = parseList(await searchParams, spec);
  const { rows, total, statusCounts } = await listReturnsPaged(state);
  type Row = (typeof rows)[number];
  const count = (v: string) => (v ? v.split(",").reduce((n, s) => n + (statusCounts[s] ?? 0), 0) : Object.values(statusCounts).reduce((a, b) => a + b, 0));
  const columns: Column<Row>[] = [
    { key: "id", label: "Request", sort: "date", cell: (r) => <span className="flex flex-col"><Link href={routes.adminReturn(r._id)} className="font-medium hover:underline">{r._id}</Link><span className="text-xs text-neutral-500">{r.orderId} · <RelativeTime date={r.createdAt} /></span></span> },
    { key: "customer", label: "Customer", cell: (r) => <span className="flex flex-col"><span>{r.name}</span><span className="text-xs text-neutral-500">{r.email}</span></span> },
    { key: "reason", label: "Reason", cell: (r) => RETURN_REASONS[r.reason as keyof typeof RETURN_REASONS] ?? r.reason },
    { key: "items", label: "Items", cell: (r) => <span className="block max-w-56 truncate text-xs" title={r.items.map((i) => `${i.name} ${i.variantLabel} × ${i.qty}`).join(", ")}>{r.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</span> },
    { key: "value", label: "Value", sort: "value", align: "right", cell: (r) => formatPrice(r.valueP) },
    { key: "status", label: "Status", cell: (r) => <span className="flex flex-col items-start gap-0.5"><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>{r.resolution && <span className="text-xs text-neutral-500">{r.resolution}</span>}</span> },
  ];
  return (
    <>
      <PageHeader title="Returns & claims" description="Damaged, leaked or wrong items reported by customers, with their photos and video." actions={hasRole(user, "staff") ? <AdminClaimButton /> : undefined} />
      <ListTabs base={BASE} spec={spec} state={state} filter="status" tabs={TABS.map((t) => ({ ...t, count: count(t.value) }))} />
      <ListToolbar
        placeholder="RT-, order number, email or name"
        exportKind={hasRole(user, "owner") ? "returns" : undefined}
        sorts={[{ value: "date", label: "Date" }, { value: "value", label: "Value" }]}
        filters={[
          { key: "reason", label: "Reason", type: "multi", options: Object.entries(RETURN_REASONS).map(([value, label]) => ({ value, label })) },
          { key: "resolution", label: "Resolution", options: [{ value: "refund", label: "Refund" }, { value: "replacement", label: "Replacement" }] },
          { key: "from", label: "From", type: "date" },
          { key: "to", label: "To", type: "date" },
        ]}
      />
      <DataTable
        base={BASE}
        spec={spec}
        state={state}
        total={total}
        rows={rows}
        columns={columns}
        rowKey={(r) => r._id}
        mobile={(r) => (
          <Link href={routes.adminReturn(r._id)} className="flex flex-col gap-1">
            <span className="flex justify-between gap-2"><span className="font-medium">{r._id}</span><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></span>
            <span className="text-neutral-600">{r.name} · {RETURN_REASONS[r.reason as keyof typeof RETURN_REASONS] ?? r.reason}</span>
            <span className="text-xs text-neutral-500">{r.orderId} · <RelativeTime date={r.createdAt} /> · {formatPrice(r.valueP)}</span>
          </Link>
        )}
        empty={<Empty title="No requests here">When a customer reports a problem from their order page, it appears in Open.</Empty>}
      />
    </>
  );
}
