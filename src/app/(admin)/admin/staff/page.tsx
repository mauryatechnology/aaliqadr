import { Suspense } from "react";
import { parseList, type ListSpec } from "@/lib/list-params";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { Check, Minus } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { listStaff } from "@/server/admin/ops";
import { adminDay } from "@/components/admin/format";
import { AdminSkeleton, Badge, Card, PageHeader, Table, td, th } from "@/components/admin/ui";
import { RoleSelect } from "@/components/admin/AdminForms";
import { ConfirmButton } from "@/components/admin/widgets";
import { endUserSessionsAction, removeStaffAccessAction } from "@/actions/admin/store";
import { InviteStaff } from "@/components/admin/ops/SettingsForms";

export const metadata = { title: "Staff & roles" };

/** What each role can do (docs/06 §3, docs/11 §2). Enforced by requireRole in every action. */
const MATRIX: [string, boolean, boolean, boolean][] = [
  ["View dashboard, orders, customers, inventory", true, true, true],
  ["Pack, ship and deliver orders; moderate reviews; handle claims", true, true, true],
  ["Adjust stock", false, true, true],
  ["Products, categories, collections, HSN codes", false, true, true],
  ["Coupons, content, shipping, settings", false, true, true],
  ["Cancel orders, issue refunds", false, true, true],
  ["Revenue figures, invoices, reports", false, true, true],
  ["Invite staff and change roles", false, false, true],
];

const spec: ListSpec = { sorts: ["role", "name"], defaultSort: "role", defaultDir: "asc", filters: ["role"] };
const RANK: Record<string, number> = { owner: 0, admin: 1, staff: 2 };

export default function Page(props: PageProps<"/admin/staff">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminStaff {...props} />
    </Suspense>
  );
}

async function AdminStaff({ searchParams }: PageProps<"/admin/staff">) {
  const user = await adminUser("owner");
  if (!user) return <p className="text-sm text-neutral-600">Only the owner manages staff.</p>;
  const st = parseList(await searchParams, spec);
  const { users: everyone, invites } = await listStaff();
  const q = st.q.toLowerCase();
  const users = everyone
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    .filter((u) => !st.f.role || st.f.role.includes(u.role))
    .toSorted(
      (a, b) =>
        (st.dir === "asc" ? 1 : -1) *
        (st.sort === "name" ? a.name.localeCompare(b.name) : (RANK[a.role] ?? 9) - (RANK[b.role] ?? 9) || a.name.localeCompare(b.name)),
    );
  return (
    <>
      <PageHeader
        title="Staff & roles"
        description="Give your team access with the least power they need. A role change signs that person out so it takes effect at once."
      />
      <div className="flex flex-col gap-6">
        <InviteStaff
          invites={invites.map((i) => ({ ...i, acceptedAt: i.acceptedAt?.toISOString(), createdAt: i.createdAt?.toISOString() }))}
        />
        <div>
          <ListToolbar
            placeholder="Name or email"
            sortAlways
            sorts={[
              { value: "role", label: "Role" },
              { value: "name", label: "Name" },
            ]}
            filters={[
              { key: "role", label: "Role", type: "multi", options: ["owner", "admin", "staff"].map((r) => ({ value: r, label: r })) },
            ]}
          />
          <Table>
            <thead>
              <tr>
                <th className={th}>Person</th>
                <th className={th}>Since</th>
                <th className={th}>Role</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={td}>
                    <span className="font-medium">{u.name || "—"}</span>
                    <span className="block text-xs text-neutral-500">{u.email}</span>
                  </td>
                  <td className={td}>{u.joined ? adminDay.format(u.joined) : "—"}</td>
                  <td className={td}>
                    {u.id === user.id ? (
                      <Badge tone="violet">{u.role} (you)</Badge>
                    ) : (
                      <RoleSelect userId={u.id} role={u.role} disabled={false} />
                    )}
                  </td>
                  <td className={`${td} text-right`}>
                    {u.id !== user.id && (
                      <span className="inline-flex flex-wrap justify-end gap-1">
                        <ConfirmButton
                          danger={false}
                          className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
                          confirm={`Sign ${u.name || u.email} out everywhere?`}
                          action={endUserSessionsAction.bind(null, u.id)}
                        >
                          Sign out everywhere
                        </ConfirmButton>
                        <ConfirmButton
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                          confirm={`Remove ${u.name || u.email}'s staff access?`}
                          detail="Their role becomes customer and they're signed out at once. Their past actions stay in the activity log."
                          action={removeStaffAccessAction.bind(null, u.id)}
                        >
                          Remove access
                        </ConfirmButton>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <Card title="What each role can do">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-xs tracking-wide text-neutral-500 uppercase">
                  <th className="py-2">Permission</th>
                  <th className="py-2 text-center">Staff</th>
                  <th className="py-2 text-center">Admin</th>
                  <th className="py-2 text-center">Owner</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map(([label, ...cols]) => (
                  <tr key={label} className="border-t border-neutral-100">
                    <td className="py-2">{label}</td>
                    {cols.map((on, i) => (
                      <td key={i} className="py-2 text-center">
                        {on ? (
                          <Check className="mx-auto size-4 text-emerald-700" aria-label="Yes" />
                        ) : (
                          <Minus className="mx-auto size-4 text-neutral-300" aria-label="No" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
