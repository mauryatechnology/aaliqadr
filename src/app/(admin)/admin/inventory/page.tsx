import Link from "next/link";
import { Suspense } from "react";
import { History } from "lucide-react";
import { parseList } from "@/lib/list-params";
import { routes } from "@/lib/routes";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { getEditorLookups } from "@/server/admin/queries";
import { listInventoryPaged, type InventoryRow } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { AdminSkeleton, Badge, btnSecondary, Empty, PageHeader } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { StockAdjustButton, ThresholdCell } from "@/components/admin/AdminForms";
import { StockCsvImport } from "@/components/admin/ops/StockCsvImport";

export const metadata = { title: "Inventory" };

const spec = LIST_SPECS.inventory;

export default function Page(props: PageProps<"/admin/inventory">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminInventory {...props} />
    </Suspense>
  );
}

async function AdminInventory({ searchParams }: PageProps<"/admin/inventory">) {
  const user = await adminUser();
  if (!user) return null;
  const state = parseList(await searchParams, spec);
  const [{ rows, total }, lookups] = await Promise.all([listInventoryPaged(state), getEditorLookups()]);
  const canAdjust = hasRole(user, "admin");
  const stockCell = (v: InventoryRow) => (v.stock <= 0 ? <Badge tone="red">0</Badge> : v.stock <= v.threshold ? <Badge tone="amber">{v.stock}</Badge> : v.stock);

  const columns: Column<InventoryRow>[] = [
    { key: "name", label: "Product · variant", sort: "name", cell: (v) => <span><Link href={routes.adminProduct(v.productId)} className="font-medium hover:underline">{v.name}</Link> · {v.label}{(!v.isActive || v.status !== "active") && <span className="ml-2"><Badge>hidden</Badge></span>}</span> },
    { key: "sku", label: "SKU", cell: (v) => <span className="font-mono text-xs">{v.sku}</span> },
    { key: "stock", label: "Available", sort: "stock", align: "right", cell: stockCell },
    { key: "reserved", label: "Reserved", sort: "reserved", align: "right", cell: (v) => <span className="text-neutral-600">{v.reserved}</span> },
    { key: "threshold", label: "Low at", align: "right", cell: (v) => (canAdjust ? <ThresholdCell productId={v.productId} sku={v.sku} value={v.threshold} /> : <span className="text-neutral-500">{v.threshold}</span>) },
    { key: "adjust", label: "", align: "right", cell: (v) => (canAdjust ? <StockAdjustButton productId={v.productId} sku={v.sku} label={`${v.name} · ${v.label}`} stock={v.stock} /> : null) },
  ];

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Available is what customers can buy now; reserved is held by orders awaiting payment."
        actions={
          <>
            {canAdjust && <StockCsvImport />}
            <Link href="/admin/inventory/ledger" className={btnSecondary}><History className="size-4" /> Stock ledger</Link>
          </>
        }
      />
      <ListToolbar
        placeholder="Product, SKU or barcode"
        exportKind={canAdjust ? "inventory" : undefined}
        sorts={[{ value: "name", label: "Name" }, { value: "stock", label: "Available" }, { value: "reserved", label: "Reserved" }]}
        filters={[
          { key: "stock", label: "Stock", options: [{ value: "low", label: "Low" }, { value: "out", label: "Out" }, { value: "reserved", label: "Has reserved" }] },
          { key: "category", label: "Category", options: lookups.categories.map((c) => ({ value: c.id, label: c.label })) },
          { key: "status", label: "Product", type: "multi", options: [{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" }] },
          { key: "active", label: "Variant", options: [{ value: "yes", label: "Switched on" }, { value: "no", label: "Switched off" }] },
        ]}
      />
      <DataTable
        base="/admin/inventory"
        spec={spec}
        state={state}
        total={total}
        rows={rows}
        columns={columns}
        rowKey={(v) => v.sku}
        mobile={(v) => (
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0"><span className="block truncate font-medium">{v.name} · {v.label}</span><span className="font-mono text-xs text-neutral-500">{v.sku}</span></span>
            <span className="flex items-center gap-2 tabular-nums">{stockCell(v)}{canAdjust && <StockAdjustButton productId={v.productId} sku={v.sku} label={`${v.name} · ${v.label}`} stock={v.stock} />}</span>
          </div>
        )}
        empty={<Empty title="Nothing matches">Try a different search or clear the filters.</Empty>}
      />
    </>
  );
}
