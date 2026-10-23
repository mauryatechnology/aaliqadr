import { hasRole } from "@/server/auth";
import { Suspense } from "react";
import { adminUser } from "@/server/admin/guard";
import { listInventory } from "@/server/admin/queries";
import { AdminSkeleton, Badge, Card, PageHeader, Table, td, th } from "@/components/admin/ui";
import { adminDate } from "@/components/admin/format";
import { StockAdjustForm } from "@/components/admin/AdminForms";
import { StockCsvImport } from "@/components/admin/ops/StockCsvImport";

export const metadata = { title: "Inventory" };

const MOVE_LABEL: Record<string, string> = { receive: "Received", reserve: "Reserved", release: "Released", sale: "Sold", restock: "Restocked", adjust: "Adjusted" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminInventory />
    </Suspense>
  );
}

async function AdminInventory() {
  const user = await adminUser();
  if (!user) return null;
  const { variants, movements } = await listInventory();
  const canAdjust = hasRole(user, "admin");
  return (
    <>
      <PageHeader title="Inventory" description="Available stock is what customers can buy now. Reserved is held by orders awaiting payment. Every change is recorded below." />
      {canAdjust && <div className="mb-4 flex"><StockCsvImport /></div>}
      <Table>
        <thead><tr><th className={th}>Product · size</th><th className={th}>SKU</th><th className={`${th} text-right`}>Available</th><th className={`${th} text-right`}>Reserved</th><th className={th}>{canAdjust ? "Adjust (+ received / − write-off)" : "Status"}</th></tr></thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.sku} className={v.isActive && v.status === "active" ? "" : "opacity-60"}>
              <td className={td}><span className="font-medium">{v.name}</span> · {v.label}{(!v.isActive || v.status !== "active") && <span className="ml-2"><Badge>hidden</Badge></span>}</td>
              <td className={`${td} font-mono text-xs`}>{v.sku}</td>
              <td className={`${td} text-right tabular-nums`}>{v.stock === 0 ? <Badge tone="red">0</Badge> : v.stock <= v.threshold ? <Badge tone="amber">{v.stock}</Badge> : v.stock}</td>
              <td className={`${td} text-right tabular-nums text-neutral-600`}>{v.reserved}</td>
              <td className={td}>{canAdjust ? <StockAdjustForm productId={v.productId} sku={v.sku} /> : <span className="text-neutral-500">Ask an admin to adjust</span>}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Card title="Recent stock movements" className="mt-6">
        {movements.length === 0 ? <p className="text-sm text-neutral-600">No movements yet.</p> : (
          <ul className="flex flex-col divide-y divide-neutral-100 text-sm">
            {movements.map((m, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <span><span className="font-mono text-xs">{m.sku}</span> · {MOVE_LABEL[m.type] ?? m.type} <b className="tabular-nums">{m.qty > 0 ? `+${m.qty}` : m.qty}</b>{m.ref && <span className="text-neutral-500"> · {m.ref}</span>}{m.reason && <span className="text-neutral-500"> · {m.reason}</span>}</span>
                <span className="text-xs text-neutral-500">{m.actor.name} · {m.createdAt ? adminDate.format(new Date(m.createdAt)) : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
