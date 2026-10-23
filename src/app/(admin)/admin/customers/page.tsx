import Link from "next/link";
import { routes } from "@/lib/routes";
import { Search } from "lucide-react";
import { Suspense } from "react";
import { formatPrice } from "@/lib/money";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { listCustomers } from "@/server/admin/queries";
import { AdminSkeleton, Badge, btnSecondary, Empty, inputCls, PageHeader, Table, td, th } from "@/components/admin/ui";
import { adminDay } from "@/components/admin/format";
import { RoleSelect } from "@/components/admin/AdminForms";

export const metadata = { title: "Customers" };

function mask(email: string) {
  const [u = "", d = ""] = email.split("@");
  return `${u.slice(0, 2)}***@${d}`;
}

export default function Page(props: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCustomers {...props} />
    </Suspense>
  );
}

async function AdminCustomers({ searchParams }: PageProps<"/admin/customers">) {
  const user = await adminUser();
  if (!user) return null;
  const { q } = await searchParams;
  const term = typeof q === "string" ? q.slice(0, 60) : "";
  const customers = await listCustomers(term);
  const isOwner = hasRole(user, "owner");
  const seePii = hasRole(user, "admin");
  return (
    <>
      <PageHeader title="Customers" description={isOwner ? "Signed-up customers and staff. As owner you can give someone a staff or admin role." : "Signed-up customers. Guest checkouts appear under Orders."} />
      <form action="/admin/customers" role="search" className="mb-4 flex gap-2">
        <label htmlFor="cq" className="sr-only">Search customers</label>
        <input id="cq" name="q" defaultValue={term} placeholder="Name or email" className={`${inputCls} max-w-sm`} />
        <button type="submit" className={btnSecondary} aria-label="Search"><Search className="size-4" /></button>
      </form>
      {customers.length === 0 ? <Empty title="No customers yet">People appear here after their first sign-in.</Empty> : (
        <Table>
          <thead><tr><th className={th}>Customer</th><th className={th}>Joined</th><th className={`${th} text-right`}>Orders</th><th className={`${th} text-right`}>Spent</th><th className={th}>Role</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td className={td}><Link href={routes.adminCustomer(c.id)} className="font-medium underline-offset-4 hover:underline">{c.name || "—"}</Link><span className="block text-xs text-neutral-500">{seePii ? c.email : mask(c.email)}</span></td>
                <td className={td}>{c.joined ? adminDay.format(new Date(c.joined)) : "—"}</td>
                <td className={`${td} text-right tabular-nums`}>{c.orders}</td>
                <td className={`${td} text-right tabular-nums`}>{c.spentP ? formatPrice(c.spentP) : "—"}</td>
                <td className={td}>{isOwner ? <RoleSelect userId={c.id} role={c.role} disabled={c.id === user.id} /> : <Badge tone={c.role === "customer" ? "neutral" : "violet"}>{c.role}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
