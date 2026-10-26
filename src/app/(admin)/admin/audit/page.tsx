import { Suspense } from "react";
import { parseList } from "@/lib/list-params";
import { adminUser } from "@/server/admin/guard";
import { listAuditPaged } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { AdminSkeleton, Empty, PageHeader } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { RelativeTime } from "@/components/admin/kit/Bits";

export const metadata = { title: "Activity log" };

const spec = LIST_SPECS.audit;

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
  const state = parseList(await searchParams, spec);
  const { rows, total, kinds } = await listAuditPaged(state);
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    { key: "when", label: "When", sort: "date", cell: (a) => (a.createdAt ? <RelativeTime date={a.createdAt} /> : "") },
    { key: "who", label: "Who", cell: (a) => <span className="flex flex-col"><span>{a.actor.name}</span><span className="text-xs text-neutral-500">{a.actor.role}</span></span> },
    { key: "action", label: "Action", cell: (a) => <span className="font-mono text-xs">{a.action}</span> },
    { key: "record", label: "Record", cell: (a) => <span className="block max-w-80 truncate" title={a.entity.id}>{a.entity.kind} · <span className="font-mono text-xs">{a.entity.id}</span></span> },
    { key: "detail", label: "Detail", cell: (a) => (a.detail ? <span className="block max-w-72 truncate font-mono text-[11px] text-neutral-500" title={JSON.stringify(a.detail)}>{JSON.stringify(a.detail)}</span> : null) },
  ];
  return (
    <>
      <PageHeader title="Activity log" description="Every admin change and sign-in, who made it and when. Entries can't be edited or deleted." />
      <ListToolbar
        placeholder="Action, record or person"
        exportKind="audit"
        filters={[
          { key: "kind", label: "Record", type: "multi", options: kinds.map((k) => ({ value: k, label: k })) },
          { key: "role", label: "Role", type: "multi", options: ["owner", "admin", "staff", "customer", "system"].map((r) => ({ value: r, label: r })) },
          { key: "from", label: "From", type: "date" },
          { key: "to", label: "To", type: "date" },
        ]}
      />
      <DataTable base="/admin/audit" spec={spec} state={state} total={total} rows={rows} columns={columns} rowKey={(a) => String(a._id)} empty={<Empty title="Nothing logged matches" />} />
    </>
  );
}
