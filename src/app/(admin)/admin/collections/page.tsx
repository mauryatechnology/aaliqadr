import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { parseList, type ListSpec } from "@/lib/list-params";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { Plus } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { listCollectionsAdmin } from "@/server/admin/queries";
import { routes } from "@/lib/routes";
import { AdminSkeleton, Badge, btnPrimary, Empty, PageHeader, Table, td, th } from "@/components/admin/ui";

export const metadata = { title: "Collections" };

const spec: ListSpec = { sorts: ["order", "name", "products"], defaultSort: "order", defaultDir: "asc", filters: ["kind", "visible", "featured"] };

export default function Page(props: PageProps<"/admin/collections">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCollections {...props} />
    </Suspense>
  );
}

async function AdminCollections({ searchParams }: PageProps<"/admin/collections">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage collections.</p>;
  const s = parseList(await searchParams, spec);
  const q = s.q.toLowerCase();
  const d = s.dir === "asc" ? 1 : -1;
  const rows = (await listCollectionsAdmin())
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.slug.includes(q))
    .filter((c) => !s.f.kind || s.f.kind.includes(c.kind))
    .filter((c) => !s.f.visible || (s.f.visible[0] === "yes") === c.isActive)
    .filter((c) => !s.f.featured || (s.f.featured[0] === "yes") === c.featured)
    .toSorted((a, b) => (s.sort === "name" ? d * a.name.localeCompare(b.name) : s.sort === "products" ? d * (a.liveProducts - b.liveProducts) : 0));
  return (
    <>
      <PageHeader
        title="Collections"
        description="Curated groups across categories: hand-picked, or automatic by rules (sign, element, tag, price…)."
        actions={<Link href="/admin/collections/new" className={btnPrimary}><Plus className="size-4" /> New collection</Link>}
      />
      <ListToolbar
        placeholder="Name or URL"
        sortAlways
        sorts={[{ value: "name", label: "Name" }, { value: "products", label: "Live products" }]}
        filters={[
          { key: "kind", label: "Type", options: [{ value: "manual", label: "Hand-picked" }, { value: "smart", label: "Smart" }] },
          { key: "visible", label: "Visibility", options: [{ value: "yes", label: "Visible" }, { value: "no", label: "Hidden" }] },
          { key: "featured", label: "Featured", options: [{ value: "yes", label: "Featured" }, { value: "no", label: "Not featured" }] },
        ]}
      />
      {rows.length === 0 ? (
        <Empty title="No collections match">Create one to group products for a campaign, a season or an element.</Empty>
      ) : (
        <Table>
          <thead><tr><th className={th}>Collection</th><th className={th}>Type</th><th className={`${th} text-right`}>Live products</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50">
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-neutral-100">{c.image && <Image src={c.image.url} alt="" fill sizes="40px" className="object-cover" />}</span>
                    <span>
                      <Link href={routes.adminCollection(c.id)} className="font-medium underline-offset-4 hover:underline">{c.name}</Link>
                      <span className="block font-mono text-xs text-neutral-500">/collections/{c.slug}</span>
                    </span>
                  </div>
                </td>
                <td className={td}>{c.kind === "smart" ? <Badge tone="violet">Smart · {c.rules.conditions.length} rule{c.rules.conditions.length === 1 ? "" : "s"}</Badge> : <Badge>Manual</Badge>}</td>
                <td className={`${td} text-right tabular-nums`}>{c.liveProducts}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1">
                    {c.isActive ? <Badge tone="green">Visible</Badge> : <Badge>Hidden</Badge>}
                    {c.featured && <Badge tone="blue">Featured</Badge>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
