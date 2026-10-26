import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { getCustomerAdmin } from "@/server/admin/ops";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/order-status";
import { routes } from "@/lib/routes";
import { adminDate, adminDay } from "@/components/admin/format";
import { AdminSkeleton, Badge, Card, Empty, PageHeader, Stat, STATUS_TONE, Table, td, th } from "@/components/admin/ui";
import { RoleSelect } from "@/components/admin/AdminForms";
import { CustomerProfileCard } from "@/components/admin/ops/CustomerForms";
import { AddressBook } from "@/components/account/AddressBook";
import { defaultCustomerAddressAction, deleteCustomerAddressAction, saveCustomerAddressAction } from "@/actions/admin/customers";
import { listAddresses } from "@/server/services/addresses";
import { Breadcrumbs } from "@/components/admin/kit/Layout";

export const metadata = { title: "Customer" };

export default function Page(props: PageProps<"/admin/customers/[id]">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminCustomer {...props} />
    </Suspense>
  );
}

async function AdminCustomer({ params }: PageProps<"/admin/customers/[id]">) {
  const user = await adminUser();
  if (!user) return null;
  const { id } = await params;
  const c = await getCustomerAdmin(id);
  if (!c) notFound();
  const seePii = hasRole(user, "admin");
  const addresses = seePii ? await listAddresses(c.user.id) : [];
  const showMoney = hasRole(user, "admin");
  return (
    <>
      <Breadcrumbs items={[{ label: "Customers", href: "/admin/customers" }, { label: c.user.name || "Customer" }]} />
      {(c.user.disabled || c.user.codBlocked) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {c.user.disabled && <Badge tone="red">Account deactivated</Badge>}
          {c.user.codBlocked && <Badge tone="amber">COD blocked</Badge>}
        </div>
      )}
      <PageHeader
        title={c.user.name || c.user.email}
        description={`${seePii ? c.user.email : "email hidden"}${c.user.phone && seePii ? ` · ${c.user.phone}` : ""} · joined ${c.user.joined ? adminDay.format(c.user.joined) : "—"}`}
        actions={hasRole(user, "owner") && c.user.id !== user.id ? <RoleSelect userId={c.user.id} role={c.user.role} disabled={false} /> : <Badge tone={c.user.role === "customer" ? "neutral" : "violet"}>{c.user.role}</Badge>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Orders" value={String(c.ltv.orders)} hint="Confirmed or later" />
        {showMoney && <Stat label="Lifetime value" value={formatPrice(c.ltv.spentP)} />}
        {showMoney && <Stat label="Average order" value={c.ltv.aovP ? formatPrice(c.ltv.aovP) : "—"} />}
        <Stat label="Last order" value={c.ltv.last ? adminDay.format(c.ltv.last) : "—"} hint={c.ltv.first ? `First: ${adminDay.format(c.ltv.first)}` : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Orders" className="[&>div:last-child]:p-0">
          {c.orders.length === 0 ? (
            <div className="p-5"><Empty title="No orders yet" /></div>
          ) : (
            <Table className="rounded-none border-0 shadow-none">
              <thead><tr><th className={th}>Order</th><th className={th}>Status</th><th className={th}>Payment</th><th className={`${th} text-right`}>Total</th></tr></thead>
              <tbody>
                {c.orders.map((o) => (
                  <tr key={o._id} className="hover:bg-neutral-50">
                    <td className={td}><Link href={routes.adminOrder(o._id)} className="font-medium underline-offset-4 hover:underline">{o._id}</Link><span className="block text-xs text-neutral-500">{adminDate.format(o.createdAt)} · {o.items.reduce((n, i) => n + i.qty, 0)} items</span></td>
                    <td className={td}><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
                    <td className={td}>{o.payment.method === "cod" ? "COD" : "Online"} · {o.payment.status}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatPrice(o.pricing.totalP)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <div className="flex flex-col gap-6">
          {seePii && (
            <Card title="Account">
              <CustomerProfileCard id={c.user.id} name={c.user.name} phone={c.user.phone} disabled={c.user.disabled} codBlocked={c.user.codBlocked} isStaff={c.user.role !== "customer"} />
            </Card>
          )}
          <Card title="Saved addresses">
            {seePii ? (
              <AddressBook
                addresses={addresses}
                save={saveCustomerAddressAction.bind(null, c.user.id)}
                remove={deleteCustomerAddressAction.bind(null, c.user.id)}
                makeDefault={defaultCustomerAddressAction.bind(null, c.user.id)}
              />
            ) : (
              <p className="text-sm text-neutral-600">{c.addresses.length} saved. Addresses are visible to admins.</p>
            )}
          </Card>
          <Card title="Claims">
            {c.returns.length === 0 ? <p className="text-sm text-neutral-600">None.</p> : (
              <ul className="flex flex-col gap-2 text-sm">
                {c.returns.map((r) => <li key={r._id} className="flex items-center justify-between gap-2"><Link href={routes.adminReturn(r._id)} className="underline-offset-4 hover:underline">{r._id}</Link><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></li>)}
              </ul>
            )}
          </Card>
          <Card title="Reviews">
            {c.reviews.length === 0 ? <p className="text-sm text-neutral-600">None.</p> : (
              <ul className="flex flex-col gap-2 text-sm">
                {c.reviews.map((r) => <li key={String(r._id)} className="flex items-center justify-between gap-2"><span className="flex items-center gap-1">{r.rating}<Star className="size-3.5 fill-amber-500 text-amber-500" /> {r.productName}</span><Badge tone={r.status === "approved" ? "green" : r.status === "pending" ? "amber" : "neutral"}>{r.status}</Badge></li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
