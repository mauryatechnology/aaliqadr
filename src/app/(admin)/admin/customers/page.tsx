import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/money";
import { parseList } from "@/lib/list-params";
import { routes } from "@/lib/routes";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { listCustomersPaged, type CustomerRow } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { AdminSkeleton, Badge, Empty, PageHeader } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { RelativeTime } from "@/components/admin/kit/Bits";
import { RoleSelect } from "@/components/admin/AdminForms";
import { NewCustomerButton } from "@/components/admin/ops/CustomerForms";

export const metadata = { title: "Customers" };

const spec = LIST_SPECS.customers;

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
  const state = parseList(await searchParams, spec);
  const { rows, total } = await listCustomersPaged(state);
  const isOwner = hasRole(user, "owner");
  const seePii = hasRole(user, "admin");
  const columns: Column<CustomerRow>[] = [
    { key: "name", label: "Customer", cell: (c) => <span className="flex flex-col"><Link href={routes.adminCustomer(c.id)} className="font-medium hover:underline">{c.name || "—"}</Link><span className="text-xs text-neutral-500">{seePii ? c.email : mask(c.email)}{seePii && c.phone ? ` · ${c.phone}` : ""}</span></span> },
    { key: "joined", label: "Joined", sort: "joined", cell: (c) => (c.joined ? <RelativeTime date={c.joined} /> : "—") },
    { key: "orders", label: "Orders", sort: "orders", align: "right", cell: (c) => c.orders },
    { key: "spent", label: "Spent", sort: "spent", align: "right", cell: (c) => (c.spentP ? formatPrice(c.spentP) : "—") },
    { key: "last", label: "Last order", sort: "last", cell: (c) => (c.last ? <RelativeTime date={c.last} /> : "—") },
    { key: "claims", label: "Claims", align: "right", cell: (c) => (c.openClaims ? <Badge tone="amber">{c.openClaims} open</Badge> : "") },
    { key: "role", label: "Role", cell: (c) => (isOwner ? <RoleSelect userId={c.id} role={c.role} disabled={c.id === user.id} /> : <Badge tone={c.role === "customer" ? "neutral" : "violet"}>{c.role}</Badge>) },
  ];
  return (
    <>
      <PageHeader title="Customers" description={isOwner ? "Signed-up customers and staff. As owner you can change roles." : "Signed-up customers. Guest checkouts appear under Orders."} actions={seePii ? <NewCustomerButton /> : undefined} />
      <ListToolbar
        placeholder="Name, email or phone"
        exportKind={isOwner ? "customers" : undefined}
        sorts={[{ value: "joined", label: "Joined" }, { value: "orders", label: "Orders" }, { value: "spent", label: "Spent" }, { value: "last", label: "Last order" }]}
        filters={[
          { key: "role", label: "Role", type: "multi", options: ["customer", "staff", "admin", "owner"].map((r) => ({ value: r, label: r })) },
          { key: "buyer", label: "Orders", options: [{ value: "yes", label: "Has ordered" }, { value: "no", label: "Never ordered" }] },
          { key: "claim", label: "Claims", options: [{ value: "yes", label: "Has an open claim" }] },
          { key: "from", label: "Joined from", type: "date" },
          { key: "to", label: "to", type: "date" },
        ]}
      />
      <DataTable
        base="/admin/customers"
        spec={spec}
        state={state}
        total={total}
        rows={rows}
        columns={columns}
        rowKey={(c) => c.id}
        mobile={(c) => (
          <Link href={routes.adminCustomer(c.id)} className="flex items-center justify-between gap-2">
            <span className="min-w-0"><span className="block truncate font-medium">{c.name || "—"}</span><span className="block truncate text-xs text-neutral-500">{seePii ? c.email : mask(c.email)}</span></span>
            <span className="text-right text-xs tabular-nums">{c.orders} orders<br />{c.spentP ? formatPrice(c.spentP) : ""}</span>
          </Link>
        )}
        empty={<Empty title="No customers match">People appear here after their first sign-in or when you add one.</Empty>}
      />
    </>
  );
}
