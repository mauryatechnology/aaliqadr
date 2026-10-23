import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { listCollectionsAdmin } from "@/server/admin/queries";
import { routes } from "@/lib/routes";
import { AdminSkeleton, Badge, btnPrimary, Empty, PageHeader, Table, td, th } from "@/components/admin/ui";

export const metadata = { title: "Collections" };

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCollections />
    </Suspense>
  );
}

async function AdminCollections() {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can manage collections.</p>;
  const rows = await listCollectionsAdmin();
  return (
    <>
      <PageHeader
        title="Collections"
        description="Curated groups across categories: hand-picked, or automatic by rules (sign, element, tag, price…)."
        actions={<Link href="/admin/collections/new" className={btnPrimary}><Plus className="size-4" /> New collection</Link>}
      />
      {rows.length === 0 ? (
        <Empty title="No collections yet">Create one to group products for a campaign, a season or an element.</Empty>
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
