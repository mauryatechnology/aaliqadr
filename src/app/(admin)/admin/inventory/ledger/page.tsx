import { Suspense } from "react";
import { parseList } from "@/lib/list-params";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { listLedgerPaged } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { AdminSkeleton, Empty, PageHeader } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { RelativeTime } from "@/components/admin/kit/Bits";
import { Breadcrumbs } from "@/components/admin/kit/Layout";

export const metadata = { title: "Stock ledger" };

const spec = LIST_SPECS.ledger;
const MOVE_LABEL: Record<string, string> = { receive: "Received", reserve: "Reserved", release: "Released", sale: "Sold", restock: "Restocked", adjust: "Adjusted" };

export default function Page(props: PageProps<"/admin/inventory/ledger">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Ledger {...props} />
    </Suspense>
  );
}

async function Ledger({ searchParams }: PageProps<"/admin/inventory/ledger">) {
  const user = await adminUser();
  if (!user) return null;
  const state = parseList(await searchParams, spec);
  const { rows, total } = await listLedgerPaged(state);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "date", label: "When", sort: "date", cell: (m) => (m.createdAt ? <RelativeTime date={m.createdAt} /> : "") },
    { key: "sku", label: "SKU", cell: (m) => <span className="font-mono text-xs">{m.sku}</span> },
    { key: "type", label: "Movement", cell: (m) => MOVE_LABEL[m.type] ?? m.type },
    { key: "qty", label: "Qty", align: "right", cell: (m) => <b className={m.qty < 0 ? "text-red-700" : "text-emerald-700"}>{m.qty > 0 ? `+${m.qty}` : m.qty}</b> },
    { key: "ref", label: "Reference / reason", cell: (m) => <span className="block max-w-72 truncate text-neutral-600" title={[m.ref, m.reason].filter(Boolean).join(" · ")}>{[m.ref, m.reason].filter(Boolean).join(" · ") || "—"}</span> },
    { key: "by", label: "By", cell: (m) => m.actor?.name ?? "" },
  ];
  return (
    <>
      <Breadcrumbs items={[{ label: "Inventory", href: "/admin/inventory" }, { label: "Stock ledger" }]} />
      <PageHeader title="Stock ledger" description="Every stock change, newest first. Entries are never edited or deleted." />
      <ListToolbar
        placeholder="SKU, order, reason or person"
        exportKind={hasRole(user, "admin") ? "ledger" : undefined}
        filters={[
          { key: "type", label: "Movement", type: "multi", options: Object.entries(MOVE_LABEL).map(([value, label]) => ({ value, label })) },
          { key: "from", label: "From", type: "date" },
          { key: "to", label: "To", type: "date" },
        ]}
      />
      <DataTable base="/admin/inventory/ledger" spec={spec} state={state} total={total} rows={rows} columns={columns} rowKey={(m) => String(m._id)} empty={<Empty title="No stock movements match" />} />
    </>
  );
}
