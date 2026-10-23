import { Suspense } from "react";
import { Check, Minus } from "lucide-react";
import { adminUser } from "@/server/admin/guard";
import { listStaff } from "@/server/admin/ops";
import { adminDay } from "@/components/admin/format";
import { AdminSkeleton, Badge, Card, PageHeader, Table, td, th } from "@/components/admin/ui";
import { RoleSelect } from "@/components/admin/AdminForms";
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

export default function Page() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminStaff />
    </Suspense>
  );
}

async function AdminStaff() {
  const user = await adminUser("owner");
  if (!user) return <p className="text-sm text-neutral-600">Only the owner manages staff.</p>;
  const { users, invites } = await listStaff();
  return (
    <>
      <PageHeader title="Staff & roles" description="Give your team access with the least power they need. A role change signs that person out so it takes effect at once." />
      <div className="flex flex-col gap-6">
        <InviteStaff invites={invites.map((i) => ({ ...i, acceptedAt: i.acceptedAt?.toISOString(), createdAt: i.createdAt?.toISOString() }))} />
        <Table>
          <thead><tr><th className={th}>Person</th><th className={th}>Since</th><th className={th}>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className={td}><span className="font-medium">{u.name || "—"}</span><span className="block text-xs text-neutral-500">{u.email}</span></td>
                <td className={td}>{u.joined ? adminDay.format(u.joined) : "—"}</td>
                <td className={td}>{u.id === user.id ? <Badge tone="violet">{u.role} (you)</Badge> : <RoleSelect userId={u.id} role={u.role} disabled={false} />}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Card title="What each role can do">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wide text-neutral-500"><th className="py-2">Permission</th><th className="py-2 text-center">Staff</th><th className="py-2 text-center">Admin</th><th className="py-2 text-center">Owner</th></tr></thead>
              <tbody>
                {MATRIX.map(([label, ...cols]) => (
                  <tr key={label} className="border-t border-neutral-100">
                    <td className="py-2">{label}</td>
                    {cols.map((on, i) => <td key={i} className="py-2 text-center">{on ? <Check className="mx-auto size-4 text-emerald-700" aria-label="Yes" /> : <Minus className="mx-auto size-4 text-neutral-300" aria-label="No" />}</td>)}
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
