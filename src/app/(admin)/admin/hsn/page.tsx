import { Suspense } from "react";
import { parseList, type ListSpec } from "@/lib/list-params";
import { adminUser } from "@/server/admin/guard";
import { listHsnAdmin } from "@/server/admin/queries";
import { AdminSkeleton, PageHeader } from "@/components/admin/ui";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { HsnManager } from "@/components/admin/catalog/HsnManager";

export const metadata = { title: "HSN codes" };

const spec: ListSpec = { sorts: ["code", "rate", "products"], defaultSort: "code", defaultDir: "asc", filters: ["rate", "active", "used"] };

export default function Page(props: PageProps<"/admin/hsn">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminHsn {...props} />
    </Suspense>
  );
}

async function AdminHsn({ searchParams }: PageProps<"/admin/hsn">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage HSN codes.</p>;
  const s = parseList(await searchParams, spec);
  const all = await listHsnAdmin();
  const q = s.q.toLowerCase();
  const d = s.dir === "asc" ? 1 : -1;
  const rows = all
    .filter((h) => !q || h.code.includes(q) || h.description.toLowerCase().includes(q))
    .filter((h) => !s.f.rate || s.f.rate.includes(String(h.gstRatePercent)))
    .filter((h) => !s.f.active || (s.f.active[0] === "yes") === h.isActive)
    .filter((h) => !s.f.used || (s.f.used[0] === "yes") === h.products > 0)
    .toSorted((a, b) => d * (s.sort === "rate" ? a.gstRatePercent - b.gstRatePercent : s.sort === "products" ? a.products - b.products : a.code.localeCompare(b.code)));
  return (
    <>
      <PageHeader title="HSN codes" description="The tax classifications products can use. A product's GST rate comes from its HSN code." />
      <ListToolbar
        placeholder="Code or description"
        sortAlways
        sorts={[{ value: "code", label: "Code" }, { value: "rate", label: "Rate" }, { value: "products", label: "Products" }]}
        filters={[
          { key: "rate", label: "Rate", type: "multi", options: [...new Set(all.map((h) => h.gstRatePercent))].sort((a, b) => a - b).map((r) => ({ value: String(r), label: `${r}%` })) },
          { key: "active", label: "Status", options: [{ value: "yes", label: "Active" }, { value: "no", label: "Inactive" }] },
          { key: "used", label: "Use", options: [{ value: "yes", label: "In use" }, { value: "no", label: "Unused" }] },
        ]}
      />
      <HsnManager rows={rows} />
    </>
  );
}
