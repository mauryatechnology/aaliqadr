import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/order-status";
import { parseList } from "@/lib/list-params";
import { routes } from "@/lib/routes";
import { INDIAN_STATES } from "@/config/india";
import { hasRole } from "@/server/auth";
import { adminUser } from "@/server/admin/guard";
import { listInvoicesPaged } from "@/server/admin/lists";
import { LIST_SPECS } from "@/server/admin/list-kinds";
import { financialYear } from "@/server/services/ids";
import { adminDay } from "@/components/admin/format";
import { AdminSkeleton, Badge, Empty, PageHeader, STATUS_TONE } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/kit/DataTable";
import { ListToolbar } from "@/components/admin/kit/ListToolbar";
import { CsvButton } from "@/components/admin/ops/CsvButton";

export const metadata = { title: "Invoices" };

const spec = LIST_SPECS.invoices;

export default function Page(props: PageProps<"/admin/invoices">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminInvoices {...props} />
    </Suspense>
  );
}

async function AdminInvoices({ searchParams }: PageProps<"/admin/invoices">) {
  const user = await adminUser("admin");
  if (!user) return <p className="text-sm text-neutral-600">Only admins can see invoices.</p>;
  const state = parseList(await searchParams, spec);
  const { rows, total, years } = await listInvoicesPaged(state);
  type Row = (typeof rows)[number];
  const current = financialYear(new Date());
  const fy = state.f.fy?.[0] || current;
  const columns: Column<Row>[] = [
    { key: "inv", label: "Invoice", sort: "date", cell: (o) => <span className="flex flex-col"><a href={routes.invoice(o._id)} target="_blank" rel="noreferrer" className="font-mono font-medium hover:underline">{o.invoice?.number}</a><span className="text-xs text-neutral-500">{o.invoice?.issuedAt ? adminDay.format(o.invoice.issuedAt) : ""}</span></span> },
    { key: "cust", label: "Customer", cell: (o) => <span className="flex flex-col"><span>{o.contact.name}</span><span className="text-xs text-neutral-500">{o.contact.email}</span></span> },
    { key: "supply", label: "Supply", cell: (o) => <span className="flex flex-col"><span>{o.shippingAddress?.state}</span><span className="text-xs text-neutral-500">{o.placeOfSupply?.isInterState ? "IGST" : "CGST + SGST"}</span></span> },
    { key: "taxable", label: "Taxable", align: "right", cell: (o) => formatPrice(o.pricing.taxableP) },
    { key: "gst", label: "GST", align: "right", cell: (o) => formatPrice(o.pricing.cgstP + o.pricing.sgstP + o.pricing.igstP) },
    { key: "total", label: "Total", sort: "total", align: "right", cell: (o) => formatPrice(o.pricing.totalP) },
    { key: "order", label: "Order", cell: (o) => <span className="flex flex-col items-start"><Link href={routes.adminOrder(o._id)} className="hover:underline">{o._id}</Link><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></span> },
  ];
  return (
    <>
      <PageHeader title="Invoices" description="Tax invoices are numbered consecutively per financial year when an order is confirmed." actions={<CsvButton label={`GST register ${fy}`} file={`aaliqadr-invoices-${fy}.csv`} invoicesFy={fy} />} />
      <ListToolbar
        placeholder="Invoice no., order, name or email"
        exportKind={hasRole(user, "owner") ? "invoices" : undefined}
        filters={[
          { key: "fy", label: "Year", options: [...new Set([current, ...years])].map((y) => ({ value: y, label: `FY ${y}` })) },
          { key: "supply", label: "Supply", options: [{ value: "intra", label: "Within state" }, { value: "inter", label: "Inter-state" }] },
          { key: "state", label: "State", type: "multi", options: INDIAN_STATES.map((s) => ({ value: s.code, label: s.name })) },
          { key: "from", label: "From", type: "date" },
          { key: "to", label: "To", type: "date" },
        ]}
      />
      <DataTable base="/admin/invoices" spec={spec} state={state} total={total} rows={rows} columns={columns} rowKey={(o) => o._id} empty={<Empty title="No invoices match">Invoices appear here once orders are confirmed.</Empty>} />
    </>
  );
}
