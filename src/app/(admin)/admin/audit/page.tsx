import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { listAudit } from "@/server/admin/ops";
import { adminDate } from "@/components/admin/format";
import { AdminSkeleton, btnSecondary, Empty, inputCls, PageHeader, Table, td, th } from "@/components/admin/ui";

export const metadata = { title: "Activity log" };

export default function Page(props: PageProps<"/admin/audit">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminAudit {...props} />
    </Suspense>
  );
}

async function AdminAudit({ searchParams }: PageProps<"/admin/audit">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can see the activity log.</p>;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await listAudit(q, page);
  return (
    <>
      <PageHeader title="Activity log" description="Every admin change, who made it and when. Entries can't be edited or deleted." />
      <form action="/admin/audit" className="mb-4 flex gap-2">
        <label className="relative"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" /><input name="q" defaultValue={q} placeholder="Action, record or person" className={`${inputCls} w-72 pl-9`} /></label>
        <button className={btnSecondary}>Search</button>
      </form>
      {rows.length === 0 ? <Empty title="Nothing logged yet" /> : (
        <Table>
          <thead><tr><th className={th}>When</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>Record</th></tr></thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i}>
                <td className={`${td} whitespace-nowrap`}>{a.createdAt ? adminDate.format(a.createdAt) : ""}</td>
                <td className={td}>{a.actor.name}<span className="block text-xs text-neutral-500">{a.actor.role}</span></td>
                <td className={`${td} font-mono text-xs`}>{a.action}</td>
                <td className={td}>{a.entity.kind} · <span className="font-mono text-xs">{a.entity.id.slice(0, 60)}</span></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {total > page * 50 && <Link className={`${btnSecondary} mt-4`} href={`/admin/audit?q=${encodeURIComponent(q)}&page=${page + 1}` as Route}>Older</Link>}
    </>
  );
}
